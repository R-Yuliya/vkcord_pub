/* Данный скрипт слит для того, чтобы всякие дурачки на Kissyt'ах не продавали труд своих друзей без их же согласия.
    Кирилл, если ты это читаешь, то я скажу, что мне тебя жаль. Я не знаю, как ты планируешь сохранять друзей, являясь крысой.

    Да, код не идеален, но он ведь работает =)

    Если у Вас есть предложения по улучшению данной шняги - пишите мне в телеграм: @zefif
*/

const easyvk = require('easyvk');
const { Client, MessageEmbed } = require('discord.js');
const superagent = require('superagent')
const client = new Client();

const cfg = require('./configuration.json');

easyvk({
    utils: {
        longpoll: true // включение longpoll для получения сообщений
    },

    username: cfg.login, // логин / номер телефона
    password: cfg.password // пароль
}).then(async vk => {

  // функция для получения полной информации о сообщении
  async function getMessage (msgArray = []) {
    const MESSAGE_ID__INDEX = 1;
  
    return vk.call('messages.getById', {
      message_ids: msgArray[MESSAGE_ID__INDEX]
    })
  }

  client.on('ready', async() => {
    console.log('booted')
  })

  client.on('message', async(message) => {

    //отправка сообщений в чаты
    if(!message.author.bot && message.channel.parentID == cfg.parent_id) {
      vk.call('messages.send', {
        user_id: `${message.channel.topic}`,
        message: message.content,
        random_id: easyvk.randomId()
      })
      message.delete()
    }
  })


    const lpSettings = {
        forGetLongPollServer: {
          lp_version: 3,
          need_pts: 1
        },
        forLongPollServer: {
          wait: 15
        }
      }
    
    // коннектим longpoll
    vk.longpoll.connect(lpSettings).then(async lp => {

        lp.on('message', async(message) => {

          const guild = client.guilds.cache.get(cfg.guild_id);

          let fullMessage = await getMessage(message);
          fullMessage = fullMessage.items[0];

          // debug
          console.log(fullMessage);

          // запрос для получения информации о пользователе, который отправил сообщение
          let { body } = await superagent.get(`https://api.vk.com/method/users.get?user_ids=${fullMessage.from_id}&fields=photo_max&access_token=${vk.session.access_token}&v=5.126`);

          let attachmentsArray;
          let content = message[5];

          if(fullMessage.attachments[0]) {
            if(fullMessage.attachments[0].type == 'photo') {

              content = 'Картинка';

              if(message[5].length > 0) {
                content = message[5]
              }

            attachmentsArray = fullMessage.attachments[0].photo.sizes;

             }
            if(fullMessage.attachments[0].type == 'sticker') { 
              attachmentsArray = fullMessage.attachments[0].sticker.images
              content = 'Стикер';
             }
            if(fullMessage.attachments[0].type == 'wall') { 
              attachmentsArray = fullMessage.attachments[0].wall.attachments
              content = `[Запись на стене](https://vk.com/feed?w=wall${fullMessage.attachments[0].wall.from_id}_${fullMessage.attachments[0].wall.id})`;
             }

             if(fullMessage.attachments[0].type == 'audio') {
                 content = 'Аудио'
             }
          }

          // ищем канал, описание которого содержит ID пользователя. Если не находим - создаём и задаём ID в описании
          if(!guild.channels.cache.find(channel => channel.topic == `${message[3]}`)) {
            guild.channels.create(`${body.response[0].first_name} ${body.response[0].last_name}`, { reason: 'Канала не существовало', type: 'text', parent: cfg.parent_id}).then(async channel => {
              channel.setTopic(body.response[0].id);
              
              // сразу же отправляем в новый канал полученное сообщение
              let msg = new MessageEmbed()
              .setTitle(`Сообщение`)
              .setThumbnail(body.response[0].photo_max)
              .setColor('#7289DA')
              .addFields({
                name: `${body.response[0].first_name} ${body.response[0].last_name}`,
                value: content.replace('<br>', '\n')
              })
              .setTimestamp()
              if(attachmentsArray) msg.setImage(attachmentsArray[attachmentsArray.length - 1].url)
                
              channel.send(msg)
            })
          }
        
          // ищем канал, описание которого содержит ID пользователя
          const direct = guild.channels.cache.find(channel => channel.topic == `${message[3]}`)

          let msg = new MessageEmbed()
            .setTitle(`Сообщение`)
            .setThumbnail(body.response[0].photo_max)
            .setColor('#7289DA')
            .addFields({
              name: `${body.response[0].first_name} ${body.response[0].last_name}`,
              value: content.replace('<br>', '\n')
            })
            .setTimestamp()
            if(attachmentsArray) msg.setImage(attachmentsArray[attachmentsArray.length - 1].url)

          // отправляем туда полученное сообщение
          direct.send(msg)
      })
  })

  client.login(cfg.bot_token);
})
