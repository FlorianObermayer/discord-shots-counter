import { ApplicationCommandOptionType, ApplicationCommandType, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { getViolationTypes } from './violations';

type CommandName =
  'LIST_OPEN_SHOTS_COMMAND' |
  'REDEEM_SHOT_COMMAND' |
  'SHOT_COMMAND' |
  'MOTIVATE_COMMAND' |
  'MIMIMI_COMMAND' |
  'SHOT_NON_INTERACTIVE_COMMAND' |
  'MEME_COMMAND' |
  'START_RANDOM_MEMES_COMMAND' |
  'STOP_RANDOM_MEMES_COMMAND'
  ;

export const Commands: Record<CommandName, Command> = {
  LIST_OPEN_SHOTS_COMMAND: {
    name: 'list_open_shots',
    description: 'List all open shots',
    type: ApplicationCommandType.ChatInput,
    integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
    contexts: [InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  },

  REDEEM_SHOT_COMMAND: {
    name: 'redeem_shot',
    description: 'Redeem a shot for yourself',
    type: ApplicationCommandType.ChatInput,
    integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
    contexts: [InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  },

  SHOT_COMMAND: {
    name: 'shot',
    description: 'Add a shot for a player due to a violation',
    type: ApplicationCommandType.ChatInput,
    integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
    contexts: [InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  },

  MOTIVATE_COMMAND: {
    name: 'motivate',
    description: 'Play a motivational audio clip',
    type: ApplicationCommandType.ChatInput,
    integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
    contexts: [InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  },

  MIMIMI_COMMAND: {
    name: 'mimimi',
    description: 'Get a fitting reply for mimimi',
    type: ApplicationCommandType.ChatInput,
    integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
    contexts: [InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  },

  SHOT_NON_INTERACTIVE_COMMAND: {
    name: 'shot_non_interactive',
    description: 'Add a shot for a player due to a violation',
    type: ApplicationCommandType.ChatInput,
    integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
    contexts: [InteractionContextType.Guild, InteractionContextType.PrivateChannel],
    options: [
      {
        name: 'user',
        description: 'The user to add a shot for',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'violation_type',
        description: 'The violation type',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: getViolationChoices(),
      },
    ],
  },

  MEME_COMMAND: {
    name: 'meme',
    description: 'Play a random meme audio clip',
    type: ApplicationCommandType.ChatInput,
    integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
    contexts: [InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  },

  START_RANDOM_MEMES_COMMAND: {
    name: 'start_random_memes',
    description: 'Start playing random memes at random intervals',
    type: ApplicationCommandType.ChatInput,
    integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
    contexts: [InteractionContextType.Guild, InteractionContextType.PrivateChannel],
    options: [
      {
        name: 'min_delay',
        description: 'Minimum delay between memes (seconds)',
        type: ApplicationCommandOptionType.Integer,
        required: false,
        minValue: 5,
        maxValue: 300
      },
      {
        name: 'max_delay',
        description: 'Maximum delay between memes (seconds)',
        type: ApplicationCommandOptionType.Integer,
        required: false,
        minValue: 5,
        maxValue: 300
      }
    ]
  },

  STOP_RANDOM_MEMES_COMMAND: {
    name: 'stop_random_memes',
    description: 'Stop playing random memes',
    type: ApplicationCommandType.ChatInput,
    integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
    contexts: [InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  },

};
export const AllCommands: Command[] = Object.values(Commands);

function getViolationChoices() {
  const violations = getViolationTypes();
  return violations.map((violation) => ({
    name: violation.toUpperCase(),
    value: violation,
  }));
}