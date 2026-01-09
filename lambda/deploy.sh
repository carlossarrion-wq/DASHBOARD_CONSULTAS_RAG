#!/bin/bash

# Script de despliegue simplificado para Lambda
# Versión: 3.0.0

set -e

echo "🚀 Desplegando Lambda con conexión directa a RDS..."

# Variables
LAMBDA_FUNCTION_NAME="dashboard-proxy-rag"
REGION="eu-west-1"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}📦 Paso 1: Creando archivo ZIP...${NC}"
rm -f lambda-deployment.zip
zip lambda-deployment.zip lambda_function.py

echo -e "${YELLOW}📦 Paso 2: Actualizando función Lambda...${NC}"
aws lambda update-function-code \
    --function-name $LAMBDA_FUNCTION_NAME \
    --zip-file fileb://lambda-deployment.zip \
    --region $REGION

echo -e "${YELLOW}⏳ Esperando actualización...${NC}"
sleep 5

echo -e "${YELLOW}🧪 Paso 3: Probando endpoint /health...${NC}"
LAMBDA_URL=$(aws lambda get-function-url-config \
    --function-name $LAMBDA_FUNCTION_NAME \
    --region $REGION \
    --query 'FunctionUrl' \
    --output text 2>/dev/null)

echo "Lambda URL: $LAMBDA_URL"
curl -s "${LAMBDA_URL}health" | jq .

echo -e "\n${GREEN}✅ Despliegue completado!${NC}"
echo -e "${GREEN}🌐 Lambda URL: $LAMBDA_URL${NC}"

echo -e "\n${YELLOW}🧹 Limpiando...${NC}"
rm lambda-deployment.zip

echo -e "${GREEN}✨ ¡Listo!${NC}"