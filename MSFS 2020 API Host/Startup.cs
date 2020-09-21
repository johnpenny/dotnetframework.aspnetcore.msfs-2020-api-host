//░ 🛈 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//░ Author: John Penny © 2020; All rights reserved
//░ License: MIT
//░ Notes:

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Rewrite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using JohnPenny.MSFS.SimConnectManager.REST.Interfaces;
using JohnPenny.MSFS.SimConnectManager.REST.Models;
using JohnPenny.MSFS.SimConnectManager.REST.Services;
using System.IO;

namespace JohnPenny.MSFS.SimConnectManager.REST
{
	public class Startup
	{
		public Startup(IConfiguration configuration)
		{
			Configuration = configuration;
		}

		public IConfiguration Configuration { get; }

		// This method gets called by the runtime. Use this method to add services to the container.
		public void ConfigureServices(IServiceCollection services)
		{
			services.AddCors(options =>
			{
				options.AddDefaultPolicy(
					builder =>
					{
						builder.WithOrigins("*");
					});
			});

			services.AddMvc()
				.AddRazorPagesOptions(options =>
				{
					options.Conventions.AddPageRoute("/bookmarklet", "b");
					options.Conventions.AddPageRoute("/applet", "a");
					options.Conventions.AddPageRoute("/map", "m");
					options.Conventions.AddPageRoute("/docs", "d");
				});

			services.AddSingleton<IDataRepository<Aircraft>, AircraftRepository>();

			services.AddLogging(builder =>
			{
				builder.AddFilter("Microsoft", LogLevel.Warning)
					.AddConsole();
			});
		}

		// This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
		public void Configure(IApplicationBuilder app, IHostingEnvironment env)
		{
			using (StreamReader apacheModRewriteStreamReader = File.OpenText("ApacheModRewrite.txt"))
			{
				var options = new RewriteOptions().AddApacheModRewrite(apacheModRewriteStreamReader);
				app.UseRewriter(options);
			}

			if (env.IsDevelopment())
			{
				app.UseDeveloperExceptionPage();
			}
			else
			{
				//app.UseHsts(); // dont use strict ssl headers
			}

			app.UseCors(); // allow cross site requests
			app.UseMvc();
			app.UseDefaultFiles();
			app.UseStaticFiles(); // serve static files
		}
	}
}
