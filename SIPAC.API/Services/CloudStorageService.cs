namespace SIPAC.API.Services;

public class CloudStorageService
{
    private readonly IWebHostEnvironment _env;

    public CloudStorageService(IWebHostEnvironment env)
    {
        _env = env;
    }

    public async Task<string> UploadFileAsync(IFormFile file, string folder = "uploads")
    {
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
