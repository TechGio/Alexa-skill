module.exports = {
    // we now specify which attributes are saved (see the save interceptor below)
    PERSISTENT_ATTRIBUTES_NAMES: ['vincitore','rispostaUtenteQuesito','utenteDB','nomeRoutineDB','modAvvio','eliminaAzione','azioneScelta','modAzione','dispositivo','durata','rispostaUtenteConflittoPossibile','risolvere','riprogrammare','rispostaUtente','preferenzeUtenteCorrente','preferenzeUtenteDB','azioniConflittuali','routines','confirmation','temperatura','stanza','tipologia_luce','azioni','motivazione','motivazioni','utenti','day','mese','anno','nome_creatore','name','nome','avvio','frase','giorni','ora','alba_tramonto','fascia_giorno','oraSveglia','azione','tempo',
    'alexaFrase','appuntamenti','musica','traffico','sveglia','indice','id','alexa','fascia','suono','tv','tvAzione','modificaAzione'],
    // these are the permissions needed to fetch the first name
    GIVEN_NAME_PERMISSION: ['alexa::profile:given_name:read'],
    // these are the permissions needed to send reminders
    REMINDERS_PERMISSION: ['alexa::alerts:reminders:skill:readwrite'],
    // max number of entries to fetch from the external API
    //MAX_BIRTHDAYS: 5,
    // APL documents
     APL: {
         listDoc:require('./documents/opzioni.json'),
         /*launchDoc: require('./documents/launchScreen.json'),
         list:require('./documents/list.json'),
         finale:require('./documents/elencoFinale.json'),
         dati:('./data/prova.json'),*/
         
     }
   
}