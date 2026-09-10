import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  type AttributeType,
  type UserType
} from "@aws-sdk/client-cognito-identity-provider";

export interface CognitoInvitationIdentity {
  username: string;
  sub: string;
  status: string | null;
}

export class CognitoInvitationsNotConfiguredError extends Error {
  constructor() {
    super("Cognito invitations are not configured");
    this.name = "CognitoInvitationsNotConfiguredError";
  }
}

function attribute(attributes: AttributeType[] | undefined, name: string): string | null {
  return attributes?.find((item) => item.Name === name)?.Value ?? null;
}

function mapIdentity(user: UserType | undefined): CognitoInvitationIdentity {
  const username = user?.Username;
  const sub = attribute(user?.Attributes, "sub");

  if (!username || !sub) {
    throw new Error("Cognito did not return a complete user identity");
  }

  return {
    username,
    sub,
    status: user.UserStatus ?? null
  };
}

function emailFilterValue(email: string): string {
  return email.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export class CognitoInvitationsClient {
  private readonly client: CognitoIdentityProviderClient;

  constructor(
    region: string,
    private readonly userPoolId: string | undefined
  ) {
    this.client = new CognitoIdentityProviderClient({ region });
  }

  private requiredUserPoolId(): string {
    if (!this.userPoolId) throw new CognitoInvitationsNotConfiguredError();
    return this.userPoolId;
  }

  async findByEmail(email: string): Promise<CognitoInvitationIdentity | null> {
    const result = await this.client.send(new ListUsersCommand({
      UserPoolId: this.requiredUserPoolId(),
      Filter: `email = "${emailFilterValue(email)}"`,
      Limit: 2
    }));

    if (!result.Users?.length) return null;
    if (result.Users.length > 1) {
      throw new Error("More than one Cognito identity has this email address");
    }

    return mapIdentity(result.Users[0]);
  }

  async createAndInvite(
    email: string,
    displayName: string | null
  ): Promise<CognitoInvitationIdentity> {
    const userAttributes: AttributeType[] = [
      { Name: "email", Value: email },
      { Name: "email_verified", Value: "true" }
    ];

    if (displayName) userAttributes.push({ Name: "name", Value: displayName });

    const result = await this.client.send(new AdminCreateUserCommand({
      UserPoolId: this.requiredUserPoolId(),
      Username: email,
      UserAttributes: userAttributes,
      DesiredDeliveryMediums: ["EMAIL"]
    }));

    return mapIdentity(result.User);
  }

  async resend(username: string): Promise<void> {
    await this.client.send(new AdminCreateUserCommand({
      UserPoolId: this.requiredUserPoolId(),
      Username: username,
      MessageAction: "RESEND",
      DesiredDeliveryMediums: ["EMAIL"]
    }));
  }

  async deleteUser(username: string): Promise<void> {
    await this.client.send(new AdminDeleteUserCommand({
      UserPoolId: this.requiredUserPoolId(),
      Username: username
    }));
  }
}
