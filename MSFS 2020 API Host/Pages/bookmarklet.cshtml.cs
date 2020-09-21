using Microsoft.AspNetCore.Mvc.RazorPages;

namespace JohnPenny.MSFS.SimConnectManager.REST.Pages
{
    public class BookmarkletModel : PageModel
    {
        public string IPInfo { get; set; }

        public void OnGet()
        {
            IPInfo = $"Server IP info {Request.HttpContext.Connection.LocalIpAddress}  Port 4380 for HTTPS (8747 for HTTP)";
        }
    }
}