using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ContactsX.Api.Services;

namespace ContactsX.Api.Controllers;

[ApiController]
[Route("api/lookups")]
[Authorize]
public class LookupsController : ControllerBase
{
    [HttpGet("nationalities")]
    public IActionResult GetNationalities()
    {
        return Ok(NationalityLookup.All);
    }
}
