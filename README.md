# SIPAC - Sistema Integral de Pañol y Abastecimiento para Consorcios

SIPAC es una plataforma web completa desarrollada para la gestión y control de inventarios de pañol, seguimiento de órdenes de trabajo en unidades funcionales/consorcios, registro de egresos/consumos de materiales, compras, administración de empleados y auditoría de operaciones en tiempo real.

---

## 🚀 Tecnologías Utilizadas

### Backend (API)
- **.NET 8 (ASP.NET Core Web API)**
- **Entity Framework Core 8** (Soporte para SQLite y PostgreSQL)
- **Autenticación JWT** (JSON Web Tokens)
- **Swagger / OpenAPI** para documentación interactiva de endpoints
- **BCrypt.Net** para hashing seguro de contraseñas
- **Cloudinary / Almacenamiento local** para gestión de comprobantes y fotos

### Frontend (Web)
- **React 18** + **TypeScript**
- **Vite** como empaquetador y servidor de desarrollo
- **Tailwind CSS** para estilizado moderno y responsivo
- **TanStack React Query** para manejo eficiente de estado asíncrono y caché
- **Zustand** para gestión de estado global de autenticación
- **Lucide React** para iconografía
- **React Hot Toast** para notificaciones interactivas

---

## 📁 Estructura del Proyecto

```text
SIPAC/
├── SIPAC.API/              # Backend en .NET 8 Web API
│   ├── Controllers/        # Controladores REST
│   ├── Data/               # DbContext y configuración EF Core
│   ├── DTOs/               # Data Transfer Objects
│   ├── Entities/           # Modelos de base de datos
│   ├── Middleware/         # Manejo global de excepciones, etc.
│   ├── Migrations/         # Migraciones de base de datos
│   ├── Services/           # Servicios de negocio (Auth, Cloudinary, etc.)
│   └── appsettings.json    # Configuración de la API
│
├── SIPAC.Web/              # Frontend React + TypeScript + Vite
│   ├── src/
│   │   ├── components/     # Componentes reutilizables (Layout, Modal, etc.)
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Páginas principales del sistema
│   │   ├── services/       # Cliente Axios y llamadas a endpoints
│   │   ├── store/          # Stores de Zustand
│   │   └── types/          # Interfaces TypeScript
│   └── package.json
│
├── .gitignore              # Reglas de exclusión para Git (.NET + Node)
├── .env.example            # Plantilla de variables de entorno
└── README.md               # Documentación del proyecto
```

---

## ⚙️ Requisitos Previos

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (versión 18 o superior)
- [Git](https://git-scm.com/)

---

## 🛠️ Instalación y Puesta en Marcha

### 1. Clonar el Repositorio
```bash
git clone https://github.com/<TU_USUARIO>/SIPAC.git
cd SIPAC
```

### 2. Configurar y Ejecutar el Backend (SIPAC.API)
```bash
cd SIPAC.API

# Restaurar paquetes NuGet
dotnet restore

# Aplicar migraciones a la base de datos (SQLite se creará automáticamente)
dotnet ef database update

# Ejecutar el backend
dotnet run
```
> La API estará disponible en `http://localhost:5225` (y Swagger UI en `http://localhost:5225/swagger`).

### 3. Configurar y Ejecutar el Frontend (SIPAC.Web)
En una nueva terminal:
```bash
cd SIPAC.Web

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```
> El cliente web estará disponible en `http://localhost:5173`.

---

## 🔒 Variables de Configuración

Revisar `SIPAC.API/appsettings.json` o utilizar variables de entorno para configurar:
- Cadena de conexión a base de datos (SQLite / PostgreSQL)
- Clave secreta JWT (`Jwt:Secret`)
- Credenciales de Cloudinary (opcional para subida de imágenes)
- Credenciales de notificaciones por WhatsApp / Email

---

## 📜 Licencia

Este proyecto se encuentra bajo la licencia MIT.
