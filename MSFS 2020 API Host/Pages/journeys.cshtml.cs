using Microsoft.AspNetCore.Mvc.RazorPages;

namespace JohnPenny.MSFS.SimConnectManager.REST.Pages
{
    public class JourneysModel : PageModel
    {
        public string IPInfo { get; set; }
        public System.Guid guid = System.Guid.NewGuid();

        public void OnGet()
        {
            IPInfo = $"Server IP info {Request.HttpContext.Connection.LocalIpAddress}  Port 4380 for HTTPS (8747 for HTTP)";
        }
    }
}