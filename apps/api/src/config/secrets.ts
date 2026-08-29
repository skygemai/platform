import {
  GetSecretValueCommand,
  SecretsManagerClient
} from "@aws-sdk/client-secrets-manager";

export class SecretsService {
  readonly #client: SecretsManagerClient;

  constructor(region: string) {
    this.#client = new SecretsManagerClient({ region });
  }

  async getSecretString(secretId: string): Promise<string> {
    const result = await this.#client.send(new GetSecretValueCommand({ SecretId: secretId }));
    if (!result.SecretString) {
      throw new Error(`Secret ${secretId} does not contain a string value`);
    }
    return result.SecretString;
  }
}
