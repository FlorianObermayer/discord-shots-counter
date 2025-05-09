// Helper type for the request body
type DiscordInteractionRequest = {
  id: string;
  type: InteractionType;
  data: {
    name: string
    options: { value: string }[]
    custom_id?: string;
    values: string[];
  };
  token: string;
  version: number;
  guild_id: string;
  member: {
    user: {
      id: string;
    }
  }
  message: {
    id: string;
  }
};
