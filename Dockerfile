# ==============================================================================
# Multi-stage Dockerfile para SIPAC
# Despliegue integrado: Frontend React (SIPAC.Web) + ASP.NET Core 8 Web API (SIPAC.API)
# Optimizado para Render (Web Service Docker)
# ==============================================================================

# ── Etapa 1: Compilar Frontend (React / Vite) ─────────────────────────────────
FROM node:20-alpine AS build-web
WORKDIR /app/web

# Instalar dependencias con caché de capas
COPY SIPAC.Web/package*.json ./
RUN npm ci

# Copiar código fuente y generar bundles en dist/
COPY SIPAC.Web/ ./
RUN npm run build

# ── Etapa 2: Compilar y Publicar API (.NET 8 SDK) ──────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-api
WORKDIR /src

# Restaurar paquetes NuGet
COPY SIPAC.API/SIPAC.API.csproj ./SIPAC.API/
RUN dotnet restore ./SIPAC.API/SIPAC.API.csproj

# Copiar código fuente del backend
COPY SIPAC.API/ ./SIPAC.API/

# Inyectar los assets compilados del frontend en wwwroot de la API
COPY --from=build-web /app/web/dist ./SIPAC.API/wwwroot

# Publicar en modo Release
WORKDIR /src/SIPAC.API
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# ── Etapa 3: Entorno de Ejecución (.NET 8 ASP.NET Runtime) ────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Crear directorio para subidas locales de respaldo si no se usa Cloudinary
RUN mkdir -p /app/wwwroot/uploads

# Copiar la aplicación publicada
COPY --from=build-api /app/publish .

# Render define dinámicamente la variable PORT (usualmente 10000)
ENV PORT=8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_HTTP_PORTS=8080

EXPOSE 8080
EXPOSE 10000

# Punto de entrada
ENTRYPOINT ["dotnet", "SIPAC.API.dll"]

