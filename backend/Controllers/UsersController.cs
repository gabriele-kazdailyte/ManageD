using Microsoft.AspNetCore.Mvc;

namespace ManageD.Controllers
{
	public class TextRequest
	{
    	public string Content { get; set; } = string.Empty;
	}

    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private static string _usersText = "Hello";

        // GET: api/users
        [HttpGet]
        public ActionResult<string> GetText()
        {
            return Ok(_usersText);
        }

        // POST: api/users
        [HttpPost]
        public IActionResult CreateText([FromBody] TextRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Content))
            {
                return BadRequest("Content cannot be empty.");
            }

            _usersText = request.Content;
            return CreatedAtAction(nameof(GetText), null, _usersText);
        }

        // PUT: api/users
        [HttpPut]
        public IActionResult UpdateText([FromBody] TextRequest request)
        {
            _usersText += request.Content;
            return NoContent();
        }

        // DELETE: api/users
        [HttpDelete]
        public IActionResult DeleteText()
        {
            _usersText = string.Empty;
            return NoContent();
        }
    }
}