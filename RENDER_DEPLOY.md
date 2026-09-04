# Guía de Despliegue de SIPAC en Render con Docker

Esta guía explica paso a paso cómo desplegar la solución completa de **SIPAC** (Web API en .NET 8 + Frontend en React) en **Render** utilizando contenedores Docker.

---

## Arquitectura de Despliegue

El proyecto está configurado mediante un **Dockerfile multi-stage** que:
1. Compila la aplicación web React (`SIPAC.Web`) usando Node.js 20.
2. Compila la API ASP.NET Core 8 (`SIPAC.API`).
3. Empaqueta el frontend compilado dentro de la carpeta `wwwroot` de la API.
4. Genera una imagen final optimizada basada en `.NET 8 ASP.NET Runtime` que sirve **tanto la API (`/api/...`) como la interfaz web (`/`)** desde un solo servicio en Render, eliminando problemas de CORS y ahorrando costos (funciona en el **Plan Gratuito** de Render).

---

## Opción 1: Despliegue con Blueprint (`render.yaml` - Recomendado)

1. Sube tu código a un repositorio en **GitHub** o **GitLab**.
2. Ingresa a tu cuenta de [Render Dashboard](https://dashboard.render.com/).
3. Haz clic en **New +** y selecciona **Blueprint**.
4. Conecta el repositorio de SIPAC.
5. Render detectará automáticamente el archivo `render.yaml` y configurará el servicio web con Docker.
6. Configura las variables secretas de base de datos en la sección **Environment Variables** (ver abajo).
7. Haz clic en **Apply** para iniciar el despliegue.

---

## Opción 2: Despliegue Manual como Web Service en Render

1. En el Dashboard de Render, haz clic en **New +** -> **Web Service**.
2. Selecciona tu repositorio de GitHub.
3. Completa los siguientes campos:
   - **Name**: `sipac` (o el nombre que prefieras)
   - **Region**: Selecciona la más cercana (ej. `Oregon` o `Frankfurt`)
   - **Branch**: `main`
   - **Runtime**: **Docker**
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: `Free`
4. En **Advanced** -> **Health Check Path**, ingresa: `/healthz`
5. En la sección **Environment Variables**, añade las variables descritas a continuación.
6. Haz clic en **Create Web Service**.

---

## Variables de Entorno (Environment Variables)

Configura estas variables en Render según tu proveedor de base de datos:

### 1. Variables Generales (Obligatorias)
| Variable | Valor Recomendado | Descripción |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` | Entorno de ejecución en producción |
| `JWT_SECRET` o `JWT__SECRET` | `Tu_Clave_Secreta_Minimo_32_Caracteres!` | Llave para firma de tokens JWT |
| `ENABLE_SWAGGER` | `true` | Permite acceder a Swagger UI en `/swagger` para pruebas |
| `ALLOWED_ORIGINS` | `*` | Orígenes CORS permitidos (o la URL de tu frontend si está separado) |

> **Nota sobre el puerto**: Render inyecta automáticamente la variable `PORT` (usualmente 10000). La API en `Program.cs` ya está configurada para escuchar dinámicamente en dicho puerto.

---

### 2. Base de Datos (Elegir UNA opción)

#### Opción A: Turso Cloud (libSQL / SQLite distribuido)
Si utilizas Turso:
| Variable | Ejemplo de Valor |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://sipacdb-tuusuario.aws-us-east-1.turso.io` |
| `TURSO_AUTH_TOKEN` | `eyJhbGciOiJFZERTQSIsInR5...` (Token de autenticación de Turso) |

#### Opción B: PostgreSQL (Render Postgres o Supabase)
Si utilizas PostgreSQL:
| Variable | Ejemplo de Valor |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres` |

> La API detecta automáticamente si la URL viene en formato URI (`postgres://...` o `postgresql://...`) y la transforma a la sintaxis nativa de Npgsql, configurando `TrustServerCertificate=true` y `SslMode=Prefer` para evitar fallos de certificados.

---

### 3. Almacenamiento Persistente de Imágenes (Opcional - Cloudinary)
En el plan gratuito de Render, el disco del contenedor se reinicia periódicamente. Para que las fotos de comprobantes de compras sean 100% permanentes, configura Cloudinary gratuito:
| Variable | Descripción |
|---|---|
| `CLOUDINARY__CLOUDNAME` | Cloud Name de tu cuenta Cloudinary |
| `CLOUDINARY__APIKEY` | API Key de Cloudinary |
| `CLOUDINARY__APISECRET` | API Secret de Cloudinary |

*Si no se configuran, la API guardará las imágenes en el disco local (`wwwroot/uploads`).*

---

## Verificación del Despliegue

Una vez que Render termine el build y despliegue:

1. **Monitoreo de Salud**:
   Navega a `https://tu-servicio.onrender.com/healthz`. Deberías recibir:
   ```json
   {
     "status": "healthy",
     "service": "SIPAC API",
     "timestamp": "2026-09-04T..."
   }
   ```

2. **Swagger UI**:
   Navega a `https://tu-servicio.onrender.com/swagger` para explorar y probar interactivamente todos los endpoints de la API.

3. **Frontend Integrado**:
   Navega a `https://tu-servicio.onrender.com/` para interactuar con la interfaz completa de SIPAC en React.

---

## Inicialización de Datos (Seed Data)

Al arrancar por primera vez, la API ejecuta `SeedData.InitializeAsync()`:
- Si la base de datos es nueva, crea automáticamente las tablas y carga:
  - Categorías iniciales de pañol y rubros de trabajo.
  - Usuarios por defecto:
    - **Admin**: Usuario `admin` / Contraseña `Admin123!`
    - **Pañolero**: Usuario `panolero` / Contraseña `Panol123!`
  - Catálogo de Unidades Funcionales (Torres A y B, Sectores, Locales).
  - Personal técnico y artículos de inventario de prueba.

