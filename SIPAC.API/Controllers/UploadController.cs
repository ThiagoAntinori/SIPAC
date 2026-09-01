using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIPAC.API.Services;

namespace SIPAC.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly CloudStorageService _storageService;

    public UploadController(CloudStorageService storageService)
    {
        _storageService = storageService;
    }

    [HttpPost]
    public async Task<ActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Archivo no proporcionado" });

        var url = await _storageService.UploadFileAsync(file);
        return Ok(new { url });
    }
}
