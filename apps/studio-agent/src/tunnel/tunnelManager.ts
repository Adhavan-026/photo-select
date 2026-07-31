import { spawn } from 'child_process';

export class TunnelManager {
  private static instance: TunnelManager;
  private tunnelProcess: any = null;
  private tunnelUrl: string | null = null;

  public static getInstance(): TunnelManager {
    if (!TunnelManager.instance) {
      TunnelManager.instance = new TunnelManager();
    }
    return TunnelManager.instance;
  }

  public getTunnelUrl(): string | null {
    return this.tunnelUrl;
  }

  public start() {
    const token = process.env.TUNNEL_TOKEN;
    const hasToken = token && token !== 'your_cloudflare_tunnel_token_from_dashboard' && token.trim() !== '';

    const customUrl = process.env.TUNNEL_URL;
    const hasCustomUrl = customUrl && customUrl !== 'https://studio-relay.trycloudflare.com' && customUrl.trim() !== '';

    if (hasToken || hasCustomUrl) {
      console.log(`🛡️ External Tunnel configured (${customUrl || 'using Token'}). Skipping internal Quick Tunnel.`);
      this.tunnelUrl = customUrl || null;
      return;
    }

    console.log('🌀 No custom Tunnel Token. Starting Cloudflare Quick Tunnel (trycloudflare.com)...');
    
    // Spawn cloudflared to run a free quick tunnel to Nginx container
    // Inside the docker network, the nginx container is reachable at http://nginx:80
    this.tunnelProcess = spawn('cloudflared', [
      'tunnel',
      '--no-autoupdate',
      '--url',
      'http://nginx:80'
    ]);

    this.tunnelProcess.stderr.on('data', (data: Buffer) => {
      const log = data.toString();
      // Search for: https://*.trycloudflare.com
      const match = log.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && match[0] !== 'https://studio-relay.trycloudflare.com') {
        this.tunnelUrl = match[0];
        console.log(`🚀 Live Quick Tunnel URL generated: ${this.tunnelUrl}`);
      }
    });

    this.tunnelProcess.on('close', (code: number) => {
      console.log(`cloudflared tunnel process exited with code ${code}`);
      this.tunnelProcess = null;
      // Restart after 10 seconds if closed unexpectedly
      setTimeout(() => this.start(), 10000);
    });
  }

  public stop() {
    if (this.tunnelProcess) {
      this.tunnelProcess.kill();
      this.tunnelProcess = null;
    }
  }
}
