using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace SIPAC.API.Services;

public class CloudStorageService
{
    private readonly IWebHostEnvironment _env;
    private readonly Cloudinary? _cloudinary;

    public CloudStorageService(IWebHostEnvironment env, IConfiguration configuration)
    {
        _env = env;
        var cloudName = configuration["Cloudinary:CloudName"]
            ?? Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME")
            ?? Environment.GetEnvironmentVariable("CLOUDINARY__CLOUDNAME");

        var apiKey = configuration["Cloudinary:ApiKey"]
            ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY")
            ?? Environment.GetEnvironmentVariable("CLOUDINARY__APIKEY");

        var apiSecret = configuration["Cloudinary:ApiSecret"]
            ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET")
            ?? Environment.GetEnvironmentVariable("CLOUDINARY__APISECRET");

        if (!string.IsNullOrWhiteSpace(cloudName) && !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(apiSecret))
        {
            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
            _cloudinary.Api.Secure = true;
            Console.WriteLine("[CloudStorage] Cloudinary inicializado correctamente para almacenamiento persistente.");
        }
    }

    public async Task<string> UploadFileAsync(IFormFile file, string folder = "uploads")
    {
        if (_cloudinary != null)
        {
            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = folder,
                UseFilename = true,
                UniqueFilename = true
            };
            var result = await _cloudinary.UploadAsync(uploadParams);
            if (result.Error != null)
            {
                throw new InvalidOperationException($"Error al subir archivo a Cloudinary: {result.Error.Message}");
            }
            return result.SecureUrl.ToString();
        }

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var uploadPath = Path.Combine(webRoot, folder);

        if (!Directory.Exists(uploadPath))
            Directory.CreateDirectory(uploadPath);

        var fileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
        var filePath = Path.Combine(uploadPath, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return $"/{folder}/{fileName}";
    }
}
