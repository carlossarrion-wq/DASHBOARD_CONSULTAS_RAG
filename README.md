# RAG Query Monitoring Dashboard

Dashboard de monitorización en tiempo real para consultas a sistemas RAG (Retrieval-Augmented Generation) en AWS.

## 📋 Descripción

Este dashboard proporciona una interfaz visual completa para monitorizar y analizar las consultas realizadas por usuarios y equipos a un sistema RAG. Está diseñado para ofrecer insights sobre:

- Volumen de consultas por usuario y equipo
- Distribución temporal de las consultas
- Tipos de consultas realizadas
- Tiempos de respuesta
- Uso de cuotas y límites

## 🎯 Características Principales

### 1. **User Requests (Consultas de Usuario)**
- **Métricas clave**: Total de consultas, usuarios activos, promedio de consultas/usuario, tiempo de respuesta promedio
- **Visualizaciones**:
  - Histograma de volumen de consultas por hora
  - Distribución de consultas por usuario
  - Gráfico de consultas diarias por usuario
  - Distribución de tipos de consulta
- **Tabla detallada** con paginación que muestra:
  - Usuario, nombre, equipo
  - Consultas diarias/mensuales
  - Límites y porcentaje de uso
  - Tiempo de respuesta promedio
- **Alertas** para usuarios que superan umbrales de uso

### 2. **Team Requests (Consultas de Equipo)**
- **Visualizaciones**:
  - Gráfico de consultas mensuales por equipo
  - Gráfico de consultas diarias por equipo
- **Tablas**:
  - Detalles de consultas por equipo con límites y uso
  - Usuarios dentro de cada equipo con su contribución
- **Alertas** para equipos que superan umbrales

### 3. **Requests Details (Detalles de Consultas)**
- **Tendencia diaria** de los últimos 10 días
- **Tabla histórica** con paginación mostrando consultas por usuario en los últimos 10 días
- **Tabla de tipos de consulta** por equipo
- **Evolución del tiempo de respuesta** en los últimos 10 días

## 🏗️ Estructura del Proyecto

```
DASHBOARD_CONSULTAS_RAG/
├── rag_dashboard.html          # Página principal del dashboard
├── css/
│   └── dashboard.css           # Estilos del dashboard
├── js/
│   ├── config.js              # Configuración (equipos, colores, límites)
│   ├── data-service.js        # Servicio de datos (a implementar)
│   ├── charts.js              # Funciones de gráficos (a implementar)
│   └── dashboard.js           # Lógica principal (a implementar)
└── README.md                   # Este archivo
```

## 🚀 Instalación y Configuración

### Requisitos Previos
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Acceso a los datos de consultas RAG (base de datos, API, etc.)

### Configuración

1. **Editar `js/config.js`**:
   ```javascript
   // Actualizar con tus equipos reales
   const ALL_TEAMS = [
       'Tu Equipo 1',
       'Tu Equipo 2',
       // ...
   ];
   
   // Ajustar límites según tus necesidades
   const DEFAULT_QUOTA_CONFIG = {
       users: {
           default: {
               daily_limit: 100,      // Consultas diarias por usuario
               monthly_limit: 3000,   // Consultas mensuales por usuario
               warning_threshold: 60, // % para alerta amarilla
               critical_threshold: 85 // % para alerta roja
           }
       },
       teams: {
           default: {
               monthly_limit: 15000,  // Consultas mensuales por equipo
               warning_threshold: 60,
               critical_threshold: 85
           }
       }
   };
   ```

2. **Implementar `js/data-service.js`**:
   - Conectar con tu fuente de datos (DynamoDB, RDS, API, etc.)
   - Implementar funciones para obtener:
     - Lista de usuarios y equipos
     - Métricas de consultas (diarias, mensuales)
     - Tipos de consultas
     - Tiempos de respuesta

3. **Implementar `js/charts.js`**:
   - Funciones para actualizar los gráficos Chart.js
   - Basado en el ejemplo del dashboard original

4. **Implementar `js/dashboard.js`**:
   - Lógica de carga de datos
   - Gestión de pestañas
   - Paginación de tablas
   - Exportación a CSV

## 📊 Fuente de Datos

El dashboard está diseñado para trabajar con datos de consultas RAG que incluyan:

### Estructura de Datos Requerida

```javascript
// Ejemplo de estructura de datos de usuario
{
    username: "usuario@empresa.com",
    name: "Nombre Usuario",
    team: "Engineering",
    daily: [0, 5, 3, 8, 12, 7, 9, 15, 11, 6, 14], // Últimos 11 días
    monthly: 245,
    avgResponseTime: 1.2 // segundos
}

// Ejemplo de estructura de datos de equipo
{
    team: "Engineering",
    daily: [0, 45, 38, 52, 67, 51, 49, 73, 61, 48, 69],
    monthly: 1523,
    avgResponseTime: 1.5
}
```

## 🎨 Personalización

### Colores
Edita `CHART_COLORS` en `js/config.js` para cambiar la paleta de colores.

### Límites y Umbrales
Ajusta `DEFAULT_QUOTA_CONFIG` en `js/config.js` según tus necesidades.

### Tipos de Consulta
Modifica `QUERY_TYPES` en `js/config.js` para reflejar los tipos de consulta de tu sistema RAG.

## 📱 Características Técnicas

- **Responsive Design**: Adaptado para desktop, tablet y móvil
- **Paginación**: Tablas con paginación para manejar grandes volúmenes de datos
- **Exportación**: Botones para exportar tablas a CSV
- **Indicadores Visuales**: Barras de progreso con código de colores para uso de cuotas
- **Actualización en Tiempo Real**: Botones de refresh para actualizar datos
- **Alertas Inteligentes**: Sistema de alertas basado en umbrales configurables

## 🔧 Integración con AWS

Para integrar con servicios AWS:

1. **DynamoDB**: Almacenar métricas de consultas
2. **CloudWatch**: Métricas y logs de consultas
3. **Lambda**: Procesar y agregar datos
4. **API Gateway**: Exponer endpoints para el dashboard

## 📈 Métricas Clave

El dashboard rastrea y visualiza:

- **Volumen**: Total de consultas por período
- **Distribución**: Consultas por usuario, equipo, hora del día
- **Rendimiento**: Tiempos de respuesta promedio
- **Uso**: Porcentaje de cuotas utilizadas
- **Tendencias**: Evolución temporal de las métricas

## 🛠️ Desarrollo

### Próximos Pasos

1. Implementar `js/data-service.js` con tu fuente de datos
2. Implementar `js/charts.js` para visualizaciones
3. Implementar `js/dashboard.js` con la lógica principal
4. Conectar con tu sistema de autenticación
5. Configurar actualización automática de datos

### Estructura de Funciones Recomendada

```javascript
// data-service.js
async function getUsers() { /* ... */ }
async function getTeams() { /* ... */ }
async function getUserMetrics(userId) { /* ... */ }
async function getTeamMetrics(teamId) { /* ... */ }

// charts.js
function updateUserDailyChart(data) { /* ... */ }
function updateTeamMonthlyChart(data) { /* ... */ }
function updateHourlyHistogram(data) { /* ... */ }

// dashboard.js
async function loadDashboardData() { /* ... */ }
function showTab(tabId) { /* ... */ }
function exportToCSV(tableId) { /* ... */ }
```

## 📝 Notas

- El dashboard está basado en el diseño del AWS Bedrock Usage Dashboard
- Adaptado específicamente para monitorización de consultas RAG
- Incluye las 3 pestañas principales solicitadas
- Mantiene el layout y controles del dashboard original
- Incluye paginación en todas las tablas con datos extensos

## 🤝 Contribuciones

Para contribuir al desarrollo:

1. Implementa las funciones pendientes en los archivos JS
2. Añade nuevas visualizaciones según necesidades
3. Mejora la integración con fuentes de datos
4. Optimiza el rendimiento para grandes volúmenes

## 📄 Licencia

Este dashboard es una adaptación del AWS Bedrock Usage Dashboard para monitorización de sistemas RAG.

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2025
