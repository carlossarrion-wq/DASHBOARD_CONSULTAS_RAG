"""
Dashboard Lambda Function - Direct RDS Connection
Versión: 3.0.0
Conecta directamente a PostgreSQL RDS sin Flask intermedio
"""

import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from urllib.parse import parse_qs

# Configuración de base de datos desde variables de entorno
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'rag-postgres.czuimyk2qu10.eu-west-1.rds.amazonaws.com'),
    'database': os.environ.get('DB_NAME', 'ragdb'),
    'user': os.environ.get('DB_USER', 'raguser'),
    'password': os.environ.get('DB_PASSWORD', 'RAGSystem2025!'),
    'port': int(os.environ.get('DB_PORT', '5432'))
}

def get_db_connection():
    """Obtiene conexión a PostgreSQL RDS"""
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

def create_response(status_code, body, origin=None):
    """Crea respuesta HTTP estándar - CORS manejado por Lambda URL"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body, default=str)
    }

def handle_analytics(query_params, origin=None):
    """Endpoint: /analytics"""
    print("📊 Handling /analytics request")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get person stats
        cursor.execute("""
            SELECT 
                person_name as person,
                COUNT(*) as count,
                AVG(response_time_ms) as avg_response_time
            FROM web_queries
            WHERE person_name IS NOT NULL
            GROUP BY person_name
            ORDER BY count DESC
        """)
        person_stats = cursor.fetchall()
        
        # Get team stats
        cursor.execute("""
            SELECT 
                app_name as team,
                COUNT(*) as count,
                AVG(response_time_ms) as avg_response_time
            FROM web_queries
            WHERE app_name IS NOT NULL
            GROUP BY app_name
            ORDER BY count DESC
        """)
        team_stats = cursor.fetchall()
        
        # Get model stats
        cursor.execute("""
            SELECT 
                'claude-3-haiku' as model_id,
                COUNT(*) as count
            FROM web_queries
        """)
        model_stats = cursor.fetchall()
        
        conn.close()
        
        return create_response(200, {
            'personStats': [dict(row) for row in person_stats],
            'teamStats': [dict(row) for row in team_stats],
            'modelStats': [dict(row) for row in model_stats]
        }, origin)
        
    except Exception as e:
        print(f"❌ Error in analytics: {e}")
        return create_response(500, {'error': str(e)}, origin)

def handle_filters(query_params, origin=None):
    """Endpoint: /filters"""
    print("📊 Handling /filters request")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get unique persons
        cursor.execute("""
            SELECT DISTINCT person_name 
            FROM web_queries 
            WHERE person_name IS NOT NULL 
            ORDER BY person_name
        """)
        persons = [row['person_name'] for row in cursor.fetchall()]
        
        # Get unique teams
        cursor.execute("""
            SELECT DISTINCT app_name 
            FROM web_queries 
            WHERE app_name IS NOT NULL 
            ORDER BY app_name
        """)
        teams = [row['app_name'] for row in cursor.fetchall()]
        
        # Models (hardcoded for now)
        models = ['claude-3-haiku']
        
        conn.close()
        
        return create_response(200, {
            'persons': persons,
            'teams': teams,
            'models': models
        }, origin)
        
    except Exception as e:
        print(f"❌ Error in filters: {e}")
        return create_response(500, {'error': str(e)}, origin)

def handle_query_logs(query_params, origin=None):
    """Endpoint: /query-logs"""
    print("📊 Handling /query-logs request")
    
    try:
        # Parse query parameters
        limit = int(query_params.get('limit', ['100'])[0])
        offset = int(query_params.get('offset', ['0'])[0])
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build WHERE clause based on filters
        where_clauses = [
            "person_name IS NOT NULL",
            "app_name IS NOT NULL",
            "llm_trust_category IS NOT NULL"
        ]
        params = []
        
        # Add optional filters
        if 'person' in query_params:
            where_clauses.append("person_name = %s")
            params.append(query_params['person'][0])
        
        if 'team' in query_params:
            where_clauses.append("app_name = %s")
            params.append(query_params['team'][0])
        
        if 'start_date' in query_params:
            where_clauses.append("created_at >= %s")
            params.append(query_params['start_date'][0])
        
        if 'end_date' in query_params:
            where_clauses.append("created_at <= %s")
            params.append(query_params['end_date'][0])
        
        where_clause = " AND ".join(where_clauses)
        
        # Main query
        query = f"""
            SELECT 
                id as query_id,
                user_id,
                created_at as request_timestamp,
                person_name as person,
                app_name as team,
                app_name as iam_group,
                user_name,
                session_token,
                conversation_id_bedrock,
                query_text as user_query,
                llm_response,
                COALESCE(status, 'completed') as status,
                COALESCE(response_time_ms, 0) as processing_time_ms,
                tokens_input,
                tokens_output,
                tokens_total,
                tokens_total as tokens_used,
                'claude-3-haiku' as model_id,
                COALESCE(app_name, 'general-kb') as knowledge_base_id,
                COALESCE(confidence_score, 0) as llm_trust,
                COALESCE(confidence_score, 0) as confidence_score,
                CASE 
                    WHEN llm_trust_category = 'high' THEN 'ALTO'
                    WHEN llm_trust_category = 'medium' THEN 'MEDIO'
                    WHEN llm_trust_category = 'low' THEN 'BAJO'
                    ELSE 'MEDIO'
                END as llm_trust_category,
                tools_used,
                tool_results
            FROM web_queries
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        
        params.extend([limit, offset])
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        # Count total
        count_query = f"SELECT COUNT(*) as total FROM web_queries WHERE {where_clause}"
        cursor.execute(count_query, params[:-2])  # Exclude limit and offset
        total = cursor.fetchone()['total']
        
        conn.close()
        
        # Format data
        data = []
        for row in rows:
            data.append({
                'query_id': str(row['query_id']),
                'user_id': row['user_id'],
                'request_timestamp': row['request_timestamp'].isoformat() if row['request_timestamp'] else None,
                'person': row['person'],
                'person_name': row['person'],
                'team': row['team'],
                'iam_group': row['iam_group'],
                'user_name': row['user_name'],
                'session_token': row['session_token'],
                'conversation_id_bedrock': row['conversation_id_bedrock'],
                'user_query': row['user_query'],
                'llm_response': row['llm_response'],
                'status': row['status'],
                'processing_time_ms': float(row['processing_time_ms']) if row['processing_time_ms'] else 0,
                'tokens_input': row['tokens_input'],
                'tokens_output': row['tokens_output'],
                'tokens_total': row['tokens_total'],
                'tokens_used': row['tokens_used'],
                'model_id': row['model_id'],
                'knowledge_base_id': row['knowledge_base_id'],
                'llm_trust': float(row['llm_trust']) if row['llm_trust'] else 0,
                'confidence_score': float(row['confidence_score']) if row['confidence_score'] else 0,
                'llm_trust_category': row['llm_trust_category'],
                'tools_used': row['tools_used'],
                'tool_results': row['tool_results']
            })
        
        return create_response(200, {
            'data': data,
            'total': total,
            'limit': limit,
            'offset': offset
        }, origin)
        
    except Exception as e:
        print(f"❌ Error in query-logs: {e}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': str(e)}, origin)

def handle_trust_analytics(query_params, origin=None):
    """Endpoint: /trust-analytics"""
    print("📊 Handling /trust-analytics request")
    
    try:
        # Get days parameter (default: 7)
        days = int(query_params.get('days', ['7'])[0])
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # 1. INDICATORS - Trust metrics for today and period
        # Today's metrics
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        cursor.execute("""
            SELECT 
                AVG(confidence_score) as avg_trust,
                PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY confidence_score) as p80_trust,
                COUNT(CASE WHEN llm_trust_category = 'high' THEN 1 END) * 100.0 / COUNT(*) as high_rate
            FROM web_queries
            WHERE created_at >= %s
                AND confidence_score IS NOT NULL
        """, [today_start])
        today_metrics = cursor.fetchone()
        
        # Period metrics
        cursor.execute("""
            SELECT 
                AVG(confidence_score) as avg_trust,
                PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY confidence_score) as p80_trust,
                COUNT(CASE WHEN llm_trust_category = 'high' THEN 1 END) * 100.0 / COUNT(*) as high_rate
            FROM web_queries
            WHERE created_at >= %s
                AND confidence_score IS NOT NULL
        """, [start_date])
        period_metrics = cursor.fetchone()
        
        # 2. TABLES - Trust by team and day
        cursor.execute("""
            SELECT 
                app_name as team,
                DATE(created_at) as date,
                AVG(confidence_score) as avg_trust
            FROM web_queries
            WHERE created_at >= %s
                AND app_name IS NOT NULL
                AND confidence_score IS NOT NULL
            GROUP BY app_name, DATE(created_at)
            ORDER BY app_name, date
        """, [start_date])
        trust_by_team_day = cursor.fetchall()
        
        # Trust by typology (strategy_type)
        cursor.execute("""
            SELECT 
                COALESCE(llm_trust_category, 'unknown') as strategy_type,
                AVG(confidence_score) as avg_trust,
                COUNT(*) as query_count,
                MIN(confidence_score) as min_trust,
                MAX(confidence_score) as max_trust
            FROM web_queries
            WHERE created_at >= %s
                AND confidence_score IS NOT NULL
            GROUP BY llm_trust_category
            ORDER BY avg_trust DESC
        """, [start_date])
        trust_by_typology = cursor.fetchall()
        
        # 3. CHARTS - Trust distribution
        cursor.execute("""
            SELECT 
                llm_trust_category as category,
                COUNT(*) as count
            FROM web_queries
            WHERE created_at >= %s
                AND llm_trust_category IS NOT NULL
            GROUP BY llm_trust_category
        """, [start_date])
        trust_distribution = cursor.fetchall()
        
        # Trust evolution by team (last N days)
        cursor.execute("""
            SELECT 
                app_name as team,
                DATE(created_at) as date,
                AVG(confidence_score) as avg_trust
            FROM web_queries
            WHERE created_at >= %s
                AND app_name IS NOT NULL
                AND confidence_score IS NOT NULL
            GROUP BY app_name, DATE(created_at)
            ORDER BY date, app_name
        """, [start_date])
        trust_evolution = cursor.fetchall()
        
        # Trust levels evolution (high/medium/low counts by day)
        cursor.execute("""
            SELECT 
                DATE(created_at) as date,
                llm_trust_category as level,
                COUNT(*) as count
            FROM web_queries
            WHERE created_at >= %s
                AND llm_trust_category IS NOT NULL
            GROUP BY DATE(created_at), llm_trust_category
            ORDER BY date, level
        """, [start_date])
        trust_levels = cursor.fetchall()
        
        conn.close()
        
        # Format response
        response = {
            'indicators': {
                'avgTrustToday': float(today_metrics['avg_trust'] or 0) / 100,  # Convert to 0-1
                'avgTrustPeriod': float(period_metrics['avg_trust'] or 0) / 100,
                'percentile80Today': float(today_metrics['p80_trust'] or 0) / 100,
                'percentile80Period': float(period_metrics['p80_trust'] or 0) / 100,
                'highConfidenceRateToday': float(today_metrics['high_rate'] or 0),
                'highConfidenceRatePeriod': float(period_metrics['high_rate'] or 0)
            },
            'tables': {
                'trustByTeamDay': [dict(row) for row in trust_by_team_day],
                'trustByTypology': [dict(row) for row in trust_by_typology]
            },
            'charts': {
                'trustDistribution': {row['category']: row['count'] for row in trust_distribution},
                'trustEvolutionByTeam': [dict(row) for row in trust_evolution],
                'trustLevelsEvolution': [dict(row) for row in trust_levels]
            }
        }
        
        return create_response(200, response, origin)
        
    except Exception as e:
        print(f"❌ Error in trust-analytics: {e}")
        import traceback
        traceback.print_exc()
        return create_response(500, {'error': str(e)}, origin)

def handle_query_log_detail(query_id, origin=None):
    """Endpoint: /query-logs/{id}"""
    print(f"📊 Handling /query-logs/{query_id} request")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get query log
        cursor.execute("""
            SELECT 
                id as query_id,
                user_id,
                created_at as request_timestamp,
                person_name as person,
                person_name as person_name,
                app_name as team,
                app_name as iam_group,
                user_name,
                session_token,
                conversation_id_bedrock,
                query_text as user_query,
                llm_response,
                COALESCE(status, 'completed') as status,
                COALESCE(response_time_ms, 0) as processing_time_ms,
                COALESCE(response_time_ms, 0) as response_time_ms,
                tokens_input,
                tokens_output,
                tokens_total,
                tokens_total as tokens_used,
                'claude-3-haiku' as model_id,
                COALESCE(app_name, 'general-kb') as knowledge_base_id,
                COALESCE(confidence_score, 0) as llm_trust,
                COALESCE(confidence_score, 0) as confidence_score,
                llm_trust_category,
                tools_used,
                tool_results,
                retrieved_docs_count
            FROM web_queries
            WHERE id = %s
        """, [query_id])
        
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return create_response(404, {'error': 'Query log not found'}, origin)
        
        conn.close()
        
        # Format data
        data = {
            'query_id': str(row['query_id']),
            'user_id': row['user_id'],
            'request_timestamp': row['request_timestamp'].isoformat() if row['request_timestamp'] else None,
            'person': row['person'],
            'person_name': row['person_name'],
            'team': row['team'],
            'iam_group': row['iam_group'],
            'user_name': row['user_name'],
            'session_token': row['session_token'],
            'conversation_id_bedrock': row['conversation_id_bedrock'],
            'user_query': row['user_query'],
            'llm_response': row['llm_response'],
            'status': row['status'],
            'processing_time_ms': float(row['processing_time_ms']) if row['processing_time_ms'] else 0,
            'response_time_ms': float(row['response_time_ms']) if row['response_time_ms'] else 0,
            'tokens_input': row['tokens_input'],
            'tokens_output': row['tokens_output'],
            'tokens_total': row['tokens_total'],
            'tokens_used': row['tokens_used'],
            'retrieved_docs_count': row['retrieved_docs_count'],
            'model_id': row['model_id'],
            'knowledge_base_id': row['knowledge_base_id'],
            'llm_trust': float(row['llm_trust']) if row['llm_trust'] else 0,
            'confidence_score': float(row['confidence_score']) if row['confidence_score'] else 0,
            'llm_trust_category': row['llm_trust_category'],
            'tools_used': row['tools_used'],
            'tool_results': row['tool_results']
        }
        
        return create_response(200, data, origin)
        
    except Exception as e:
        print(f"❌ Error in query-log-detail: {e}")
        return create_response(500, {'error': str(e)}, origin)

def lambda_handler(event, context):
    """
    Main Lambda handler - Direct RDS connection
    """
    print(f"📊 Lambda invoked - Event: {json.dumps(event)}")
    
    # Extract origin for CORS
    headers = event.get('headers', {})
    origin = headers.get('origin') or headers.get('Origin')
    
    # Extract path and method
    path = event.get('rawPath', '/')
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    query_string = event.get('queryStringParameters') or {}
    
    # Handle OPTIONS preflight requests
    if method == 'OPTIONS':
        return create_response(200, {}, origin)
    
    # Parse query string if it's a string
    if isinstance(query_string, str):
        query_params = parse_qs(query_string)
    else:
        query_params = {k: [v] for k, v in query_string.items()}
    
    print(f"🔄 {method} {path}")
    print(f"📝 Query params: {query_params}")
    print(f"🌐 Origin: {origin}")
    
    try:
        # Route to appropriate handler - todos pasan origin para CORS correcto
        if path == '/analytics' or path == '/api/dashboard/analytics':
            return handle_analytics(query_params, origin)
        
        elif path == '/filters' or path == '/api/dashboard/filters':
            return handle_filters(query_params, origin)
        
        elif path == '/query-logs' or path == '/api/dashboard/query-logs':
            return handle_query_logs(query_params, origin)
        
        elif path.startswith('/query-logs/') or path.startswith('/api/dashboard/query-logs/'):
            query_id = path.split('/')[-1]
            return handle_query_log_detail(query_id, origin)
        
        elif path == '/trust-analytics':
            return handle_trust_analytics(query_params, origin)
        
        elif path == '/health':
            return create_response(200, {
                'status': 'healthy',
                'service': 'dashboard-lambda-rds',
                'version': '3.0.0'
            }, origin)
        
        else:
            return create_response(404, {'error': 'Endpoint not found'}, origin)
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return create_response(500, {
            'error': 'Internal server error',
            'message': str(e)
        }, origin)
