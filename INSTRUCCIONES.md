# 🚀 Instrucciones Rápidas - Dashboard RAG

## Cómo Abrir el Dashboard

### Opción 1: Abrir Directamente en el Navegador
1. Navega a la carpeta del proyecto
2. Haz doble clic en el archivo `rag_dashboard.html`
3. El dashboard se abrirá automáticamente en tu navegador predeterminado

### Opción 2: Usar un Servidor Local (Recomendado)

Si tienes Python instalado:
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Si tienes Node.js instalado:
```bash
# Instalar http-server globalmente (solo una vez)
npm install -g http-server

# Ejecutar servidor
http-server -p 8000
```

Luego abre tu navegador en: `http://localhost:8000/rag_dashboard.html`

### Opción 3: Usar Live Server en VS Code
1. Instala la extensión "Live Server" en VS Code
2. Haz clic derecho en `rag_dashboard.html`
3. Selecciona "Open with Live Server"

## 📊 Navegación del Dashboard

El dashboard tiene **3 pestañas principales**:

### 1️⃣ User Requests (Consultas de Usuario)
- **Métricas principales**: Total de consultas, usuarios activos, promedios
- **Gráficos**:
  - Histograma de consultas por hora
  - Distribución de consultas por usuario
  - Consultas diarias por usuario
  - Distribución de tipos de consulta
- **Tabla**: Detalles de consultas por usuario con paginación
- **Alertas**: Usuarios que superan umbrales de uso

### 2️⃣ Team Requests (Consultas de Equipo)
- **Gráficos**:
  - Consultas mensuales por equipo
  - Consultas diarias por equipo
- **Tablas**:
  - Detalles de consultas por equipo
  - Usuarios dentro de cada equipo (con paginación)
- **Alertas**: Equipos que superan umbrales

### 3️⃣ Requests Details (Detalles de Consultas)
- **Gráfico**: Tendencia diaria de los últimos 10 días
- **Tablas**:
  - Consultas por usuario en los últimos 10 días (con paginación)
  - Tipos de consulta por equipo
- **Gráfico**: Evolución del tiempo de respuesta

## 🎮 Funcionalidades Disponibles

### Controles Principales
- **Botón Refresh** (↻): Actualiza los datos del dashboard
- **Botón Export**: Exporta tablas a CSV
- **Botón Logout**: Cierra sesión (placeholder)

### Paginación
- Todas las tablas grandes incluyen paginación
- Usa los botones **←** y **→** para navegar entre páginas
- Muestra información de "Showing X-Y of Z"

### Indicadores Visuales
- **Barras de progreso** con código de colores:
  - 🟢 Verde (0-25%): Uso bajo
  - 🟡 Amarillo (26-75%): Uso medio
  - 🟠 Naranja (76-90%): Uso alto
  - 🔴 Rojo (91-100%): Uso crítico

### Alertas
- **Info** (azul): Información general
- **Warning** (naranja): Advertencias de uso alto
- **Critical** (rojo): Alertas críticas de uso muy alto

## 📝 Datos de Ejemplo

El dashboard incluye **datos de ejemplo** para demostración:

- **15 usuarios** distribuidos en 5 equipos
- **Equipos**: Engineering, Data Science, Product, Research, Operations
- **Métricas**: Consultas diarias/mensuales, tiempos de respuesta
- **Historial**: Últimos 10 días de datos

## 🎨 Personalización

Para personalizar el dashboard, edita:

1. **`js/config.js`**: Equipos, límites, colores
2. **`js/data-service.js`**: Fuente de datos (conectar a tu API/BD)
3. **`css/dashboard.css`**: Estilos y colores

## 🔧 Solución de Problemas

### El dashboard no carga
- Verifica que todos los archivos estén en las carpetas correctas
- Abre la consola del navegador (F12) para ver errores
- Asegúrate de tener conexión a internet (para Chart.js y Moment.js)

### Los gráficos no se muestran
- Verifica que Chart.js se haya cargado correctamente
- Revisa la consola del navegador para errores de JavaScript

### Los datos no aparecen
- Los datos son generados automáticamente al cargar
- Haz clic en el botón "Refresh" para recargar

## 📚 Más Información

Consulta el archivo `README.md` para:
- Documentación completa
- Estructura del proyecto
- Guía de desarrollo
- Integración con AWS

## 💡 Próximos Pasos

Para usar el dashboard con datos reales:

1. Implementa la conexión a tu fuente de datos en `js/data-service.js`
2. Ajusta los límites y umbrales en `js/config.js`
3. Personaliza los equipos según tu organización
4. Configura autenticación si es necesario

---

**¡Disfruta explorando el dashboard!** 🎉
