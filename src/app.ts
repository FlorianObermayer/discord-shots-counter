import express, { Request, Response } from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  verifyKeyMiddleware,
  ButtonStyleTypes,
  ActionRow,
} from 'discord-interactions';
import { capitalize, getAllOpenShotsFormatted, deletePreviousMessage, installGlobalCommands } from './utils';
import { createDatabaseService, DatabaseService } from './database';
import { getViolationTypes, ViolationType } from './violations';
import usernameCache from './usernameCache';
import { discordToken, port, verifyEnv, publicKey, appId, databaseFile } from './envHelper';
import { Commands } from './commands';
import { handleAudioCommand, MIMIMI_DIR, MOTIVATIONS_DIR } from './audioCommand';
import {
  Client, IntentsBitField,
} from 'discord.js';
import { getCachedOrDownloadMemes, handleMemeCommand, handleStartRandomMemes, handleStopRandomMemes, MemeQuery } from './memeCommand';
import { InsultService } from './insultService';
import logger from './logger';
import { getOrCreateAudioPlayerManager } from './audioPlayer';

// Catch unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

verifyEnv();

async function initializeApp() {
  logger.info('Starting server...');

  await installGlobalCommands(appId());

  const db = await createDatabaseService(databaseFile());

  logger.info('Warming up meme cache...');
  void getCachedOrDownloadMemes().catch((e) => {
    logger.error('Warming up meme cache... FAILED', e);
  }).then(() => logger.info('Warming up meme cache... DONE'));
  const insultService = new InsultService(db);
  await insultService.warmupInsultsCache();
  return { db, insultService };
}

let db: DatabaseService;
let insultService: InsultService;
void (async () => {
  ({ db, insultService } = await initializeApp());
})();

async function handleShot(guildId: string, client: Client, response: Response, offender: string, violationType: ViolationType) {
  await db.addShot(offender, violationType);

  const insult = await insultService.getAndCreateInsult(offender, violationType);

  void (async () => {
    try {
      logger.info('Insult via TTS...');

      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(offender);
      const voiceChannelId = member.voice?.channelId;

      if (voiceChannelId !== null) {
        const audioPlayerManager = getOrCreateAudioPlayerManager(guild);
        await audioPlayerManager.playTTS(voiceChannelId, insult);
        logger.info('Insult via TTS... DONE');
      } else {
        logger.info('Insult via TTS... CANCELED (no voice Channel available)');
      }
    } catch (error) {
      logger.warn('Insult TTS...FAILED', error);
    }
  })();

  const result = response.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `### Violation confirmed.\n<@${offender}> has to take a shot for **${capitalize(violationType)}**\n\n> ${insult}.`,
    }
  });

  return result;
}

async function listAllShotsChannelMessage(isPublic: boolean) {

  const dbShots = await db.getAllOpenShots();

  const shots = await Promise.all(dbShots.map(async function (shot) {
    const playerId = shot.player_id;
    const openShots = shot.open_shots;
    return {
      name: await usernameCache.getUsername(playerId),
      open_shots: openShots,
    };
  }));

  const shotsFormatted = getAllOpenShotsFormatted(shots);

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: !isPublic ? InteractionResponseFlags.EPHEMERAL : 0,
      content: shotsFormatted,
    },
  };
}

// Initialize Discord Client
const client = new Client({
  intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildVoiceStates]
});
void client.login(discordToken());

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = port();

// Health Check
app.router.get('/health', function (_, res) {
  const data = {
    uptime: process.uptime(),
    message: 'OK',
    date: new Date(),
  };

  res.status(200).send(data);
});

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(publicKey()), async function (req: Request<unknown, Response, DiscordInteractionRequest>, res: Response): Promise<void> {
  // TODO: Figure out why type causes "unsafe-assignment error"
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { type, data, guild_id } = req.body;

  logger.debug('INTERACTION::body', req.body);

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    res.send({ type: InteractionResponseType.PONG });
    return;
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;


    const userId: string = req.body.member.user.id;

    if (name === Commands['MEME_COMMAND'].name) {
      const memeQuery: MemeQuery = data.options[0]?.value as MemeQuery | undefined || 'Default';
      const customMemeQuery = data.options[1]?.value;

      const response = await handleMemeCommand(guild_id, userId, client, memeQuery, customMemeQuery);
      res.send(response);
      return;
    }

    if (name === Commands.START_RANDOM_MEMES_COMMAND.name) {
      const minDelay = Number(data.options ? data.options[0]?.value || 30 : 30); // defaults to 30 seconds
      const maxDelay = Number(data.options ? data.options[1]?.value || 60 : 60); // defaults to 60 seconds
      const maxNumberOfDifferentMemes = Number(data.options ? data.options[2]?.value || 10 : 10); // defaults to 10 different memes
      const memeQuery: MemeQuery = data.options[3]?.value as MemeQuery | undefined || 'Default';
      const customMemeQuery = data.options[4]?.value;

      const response = await handleStartRandomMemes(guild_id, userId, client, minDelay, maxDelay, maxNumberOfDifferentMemes, memeQuery, customMemeQuery);
      res.send(response);
      return;
    }

    if (name === Commands.STOP_RANDOM_MEMES_COMMAND.name) {
      const response = await handleStopRandomMemes(guild_id, userId, client);
      res.send(response);
      return;
    }

    if (name === Commands.MOTIVATE_COMMAND.name) {
      const response = await handleAudioCommand(guild_id, userId, client, MOTIVATIONS_DIR);
      res.send(response);
      return;
    }

    if (name === Commands.MIMIMI_COMMAND.name) {
      const response = await handleAudioCommand(guild_id, userId, client, MIMIMI_DIR);
      res.send(response);
      return;
    }

    if (name === Commands.SHOT_NON_INTERACTIVE_COMMAND.name) {
      const offender = data.options[0]?.value as string;
      const violation = data.options[1]?.value as ViolationType;

      await handleShot(guild_id, client, res, offender, violation);
      return;
    }

    if (name === Commands.REDEEM_SHOT_COMMAND.name) {
      // redeem 1 shot for the user
      const offender = req.body.member.user.id;
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: '### Confirm drinking a shot',
          // Selects are inside of action rows
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  // Value for your app to identify the select menu interactions
                  custom_id: 'accept_redeem_button_offender=' + offender,
                  style: ButtonStyleTypes.PRIMARY,
                  label: 'I chugged one',
                },
                {
                  type: MessageComponentTypes.BUTTON,
                  // Value for your app to identify the select menu interactions
                  custom_id: 'cancel_redeem_button_offender=' + offender,
                  style: ButtonStyleTypes.DANGER,
                  label: 'I lied',
                },
              ]
            }
          ],
        },
      });

      return;
    }

    if (name === Commands.LIST_OPEN_SHOTS_COMMAND.name) {
      // List all open shots
      res.send(await listAllShotsChannelMessage(true));
      return;
    }

    // shot command
    if (name === Commands.SHOT_COMMAND.name) {
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          // Selects are inside of action rows
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.USER_SELECT,
                  // Value for your app to identify the select menu interactions
                  custom_id: 'offender_select',
                  // Select options - see https://discord.com/developers/docs/interactions/message-components#select-menu-object-select-option-structure
                  placeholder: 'Select the offender',
                  min_values: 0,
                  max_values: 1,
                },
              ],
            },
          ],
        },
      });

      return;
    }

    logger.error(`unknown command: ${name}`);
    res.status(400).json({ error: 'unknown command' });
  }

  /**
   * Handle requests from interactive components
   * See https://discord.com/developers/docs/interactions/message-components#responding-to-a-component-interaction
   */
  if (type === InteractionType.MESSAGE_COMPONENT) {
    // custom_id set in payload when sending message component
    const componentId = data.custom_id as string;


    type MessageComponentResponseType = {
      type: InteractionResponseType;
      data: {
        flags?: InteractionResponseFlags;
        components: ActionRow[]
      };
    };

    if (componentId === 'offender_select') {

      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          // Selects are inside of action rows
          components: [
            {
              // violation select menu

              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.STRING_SELECT,
                  // Value for your app to identify the select menu interactions
                  custom_id: 'violation_select_offender=' + data.values[0],
                  // Select options - see https://discord.com/developers/docs/interactions/message-components#select-menu-object-select-option-structure
                  options: getViolationTypes
                    ().map((violation) => ({
                      label: capitalize(violation),
                      value: violation,
                    })),
                  placeholder: 'Select the violation',
                  min_values: 1,
                  max_values: 1,
                }
              ],
            },
          ],
        },
      } as MessageComponentResponseType);

      await deletePreviousMessage(req.body.token, req.body.message.id);
      return;
    }

    if (componentId.startsWith('violation_select_')) {
      const offender = componentId.split('=')[1];
      const violation = data.values[0] as ViolationType;

      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: `### Confirm the shot\n<@${offender}>: ${capitalize(violation)}`,
          // Selects are inside of action rows
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  // Value for your app to identify the select menu interactions
                  custom_id: 'accept_shot_button_offender=' + offender + ',violation=' + violation,
                  style: ButtonStyleTypes.PRIMARY,
                  label: 'Confirm',
                },
                {
                  type: MessageComponentTypes.BUTTON,
                  // Value for your app to identify the select menu interactions
                  custom_id: 'cancel_shot_button',
                  style: ButtonStyleTypes.SECONDARY,
                  label: 'Cancel',
                },
              ]
            }
          ],
        },
      });

      await deletePreviousMessage(req.body.token, req.body.message.id);
      return;
    }

    if (componentId.startsWith('accept_shot_button_')) {
      // get the associated game ID
      const offender = componentId.split('=')[1]?.split(',')[0] as string;
      const violation = componentId.split(',')[1]?.split('=')[1] as ViolationType;

      await handleShot(guild_id, client, res, offender, violation);

      await deletePreviousMessage(req.body.token, req.body.message.id);

      return;
    }

    if (componentId === 'cancel_shot_button') {
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Shot cancelled',
          flags: InteractionResponseFlags.EPHEMERAL,
        }
      });

      await deletePreviousMessage(req.body.token, req.body.message.id);
      return;
    }

    if (componentId.startsWith('cancel_redeem_button_')) {
      const offender = componentId.split('=')[1];
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `### You fucking liar. That will cost you another shot!\n@here: Please punish the filthy liar <@${offender}>!`,
        }
      });

      await deletePreviousMessage(req.body.token, req.body.message.id);
      return;
    }

    if (componentId.startsWith('accept_redeem_button_')) {
      // get the associated game ID
      const offender = componentId.split('=')[1]?.split(',')[0] as string;
      const { redeemed, violationType } = await db.redeemShot(offender);
      const content = redeemed ? `### Shot redemption confirmed.\n<@${offender}> took a shot for **${capitalize(violationType as string)}**.` : `### <@${offender}> is an absolute alcoholic. They didn't have to drink but hey, enjoy! Maybe you actually start hitting the ball soon!`;

      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: content,
        }
      });

      await deletePreviousMessage(req.body.token, req.body.message.id);
      return;
    }
  }

  logger.error('unknown interaction type', type);
  res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  logger.info('Listening on port', PORT);
});



