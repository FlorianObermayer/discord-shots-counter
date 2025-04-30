import { InteractionResponseFlags, InteractionResponseType } from 'discord-interactions';
import { Client } from 'discord.js';
import { getAllOpenShotsFormatted, insultViaTTS } from '../utils';
import { capitalize } from '../utils';
import { ViolationType } from '../types/violations';
import usernameCache from '../usernameCache';
import { IDatabaseService } from '../services/databaseService';
import { IInsultService } from '../services/insultService';


export async function handleShot(db: IDatabaseService, IInsultService: IInsultService, guildId: string, client: Client, offender: string, violationType: ViolationType) {
  await db.addShot(offender, violationType);

  const insult = await IInsultService.getAndCreateInsult(offender, violationType);

  void (async () => {
    await insultViaTTS(guildId, offender, client, insult);
  })();

  return{
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `### Violation confirmed.\n<@${offender}> has to take a shot for **${capitalize(violationType)}**\n\n> ${insult}.`,
    }
  };
}export async function handleListAllShots(db: IDatabaseService, isPublic: boolean) {

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

