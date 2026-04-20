import { Injectable, BadRequestException } from '@nestjs/common';

interface VkTokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  user_id?: number;
  email?: string;
  error?: string;
  error_description?: string;
}

interface VkUserInfoResponse {
  user?: {
    user_id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar?: string;
  };
  error?: string;
  error_description?: string;
}

@Injectable()
export class VkService {
  private readonly clientId     = process.env.VK_CLIENT_ID || '';
  private readonly clientSecret = process.env.VK_CLIENT_SECRET || '';

  async exchangeCode(params: {
    code: string;
    deviceId: string;
    codeVerifier: string;
    redirectUri: string;
    state: string;
  }): Promise<{ accessToken: string; userId: string }> {
    if (!this.clientId || !this.clientSecret) {
      throw new BadRequestException('VK OAuth не настроен на сервере');
    }

    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      code:          params.code,
      code_verifier: params.codeVerifier,
      client_id:     this.clientId,
      device_id:     params.deviceId,
      redirect_uri:  params.redirectUri,
      state:         params.state,
    });

    const res = await fetch('https://id.vk.com/oauth2/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    const data: VkTokenResponse = await res.json();
    if (!res.ok || !data.access_token || !data.user_id) {
      throw new BadRequestException(data.error_description || data.error || 'VK: не удалось обменять код');
    }
    return { accessToken: data.access_token, userId: String(data.user_id) };
  }

  async fetchUserInfo(accessToken: string): Promise<{
    vkId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }> {
    const body = new URLSearchParams({
      access_token: accessToken,
      client_id:    this.clientId,
    });
    const res = await fetch('https://id.vk.com/oauth2/user_info', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    const data: VkUserInfoResponse = await res.json();
    if (!res.ok || !data.user) {
      throw new BadRequestException(data.error_description || data.error || 'VK: не удалось получить профиль');
    }
    return {
      vkId:      data.user.user_id,
      email:     data.user.email,
      firstName: data.user.first_name,
      lastName:  data.user.last_name,
      avatar:    data.user.avatar,
    };
  }
}
