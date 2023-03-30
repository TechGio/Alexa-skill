const Alexa = require('ask-sdk-core');
const constants = require('./constants');
const util = require('./util');
const interceptors = require('./interceptors');

var log = [];

const datasource = require('./data/elencoFinale.json');
const v = require('./data/verti.json');
const text = require('./data/text.json');
const AWS = require("aws-sdk");
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;

        let speechText = handlerInput.t('GREET_MSG');
        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        
        log.push(data_stampa + "   " + "Messaggio benvenuto");
        return handlerInput.responseBuilder
            .speak(speechText)
            .addDelegateDirective({
                name: 'registraRoutineIntent',
                confirmationStatus: 'NONE',
                slots: {
                     'nome_creatore': {
                        name: 'nome_creatore',
                        confirmationStatus: 'NONE'
                      }
                }
            })
            .getResponse(); 
    }
};

const registraRoutineIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'registraRoutineIntent';
    },
    handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        resetAttributes(handlerInput);
        //recupera persistent attributes
        const persistentAttributes = attributesManager.getPersistentAttributes() || {};
        const { intent } = requestEnvelope.request;
        sessionAttributes.nome_creatore = Alexa.getSlotValue(requestEnvelope, 'nome_creatore');
        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Risposta utente: nome creatore");
        if(!sessionAttributes.hasOwnProperty('utenti')) sessionAttributes['utenti'] = [];
        let presente = false;
        for (let i = 0; i < sessionAttributes.utenti.length; i++) 
            if(sessionAttributes.utenti[i].nome_creatore === sessionAttributes.nome_creatore) presente = true;
        // se nome_creatore esiste, prosegui con la creazione della routine 
        if(presente) 
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'motivazioniIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .getResponse();
        // altrimenti, crea prima il nuovo profilo
        else 
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'registraCreatoreIntent',
                    confirmationStatus: 'NONE',
                    slots: {
                         'day': {
                            name: 'day',
                            confirmationStatus: 'NONE'
                          },
                           'mese': {
                            name: 'mese',
                            confirmationStatus: 'NONE'
                          },
                           'anno': {
                            name: 'anno',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
    }
};

//smista orario
const smistaOrarioIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'smistaOrarioIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        let orario = Alexa.getSlotValue(requestEnvelope, 'ora');
        if(sessionAttributes.avvio === "alba"){
            if(orario.includes("tramonto") || orario.includes("EV") || orario.includes("AF")) sessionAttributes['alba_tramonto'] = "tramonto";
            else if(orario.includes("alba") || orario.includes("MO")) sessionAttributes['alba_tramonto'] = "alba";
            //
            if(sessionAttributes.sveglia){
                if (orario.includes("pomeriggio") || orario.includes("EV") || orario.includes("AF")){
                    var vecchia_ora = sessionAttributes['oraSveglia'];
                    var o = parseInt(vecchia_ora.substr(0, 2));
                    var min = vecchia_ora.substr(3, 5);
                    var ore = o + 12;
                    var nuovo_orario = ore + ":" + min;
                    sessionAttributes['oraSveglia'] = nuovo_orario;
                    return handlerInput.responseBuilder
                    .addDelegateDirective({
                        name: 'confermaSvegliaIntent',
                        confirmationStatus: 'NONE',
                        slots: {}
                    })
                    .getResponse();
                }else if(orario >= "01:00" && orario <= "12:30") {
                    return handlerInput.responseBuilder
                    .addDelegateDirective({
                        name: 'domandaIntent',
                        confirmationStatus: 'NONE',
                        slots: {}
                    })
                    .getResponse();
                } else{
                    return handlerInput.responseBuilder
                    .addDelegateDirective({
                        name: 'confermaSvegliaIntent',
                        confirmationStatus: 'NONE',
                        slots: {}
                    })
                    .getResponse();
                }
            } else{
                return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'impostaGiorniAlbaIntent',
                    confirmationStatus: 'NONE',
                    slots: {
                        'giorno': {
                            name: 'giorno',
                            confirmationStatus: 'NONE'
                          },
                           'giornoDue': {
                            name: 'giornoDue',
                            confirmationStatus: 'NONE'
                          },
                           'giornoTre': {
                            name: 'giornoTre',
                            confirmationStatus: 'NONE'
                          },
                          'giornoQuattro': {
                            name: 'giornoQuattro',
                            confirmationStatus: 'NONE'
                          },
                           'giornoCinque': {
                            name: 'giornoCinque',
                            confirmationStatus: 'NONE'
                          },
                           'giornoSei': {
                            name: 'giornoSei',
                            confirmationStatus: 'NONE'
                          },
                          'giornoSette': {
                            name: 'giornoSette',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
            }
        } else{
            if (orario >= "01:00" && orario <= "12:30") {
                if(sessionAttributes.sveglia)
                    sessionAttributes.oraSveglia = orario;
                else
                    sessionAttributes['ora'] = orario;
                return handlerInput.responseBuilder
                    .addDelegateDirective({
                        name: 'domandaIntent',
                        confirmationStatus: 'NONE',
                        slots: {}
                    })
                    .getResponse();
            } else if(orario.includes("pomeriggio") || orario.includes("EV") || orario.includes("AF")){
                if(sessionAttributes.sveglia){
                    let vecchia_ora = sessionAttributes['oraSveglia'];
                    let o = parseInt(vecchia_ora.substr(0, 2));
                    let min = vecchia_ora.substr(3, 5);
                    let ore = o + 12;
                    let nuovo_orario = ore + ":" + min;
                    sessionAttributes['oraSveglia'] = nuovo_orario;
                    return handlerInput.responseBuilder
                    .addDelegateDirective({
                        name: 'confermaSvegliaIntent',
                        confirmationStatus: 'NONE',
                        slots: {}
                    })
                    .getResponse();
                }else{
                    let vecchia_ora2 = sessionAttributes['ora'];
                    let o2 = parseInt(vecchia_ora2.substr(0, 2));
                    let min2 = vecchia_ora2.substr(3, 5);
                    let ore2 = o2 + 12;
                    let nuovo_orario2 = ore2 + ":" + min2;
                    sessionAttributes['ora'] = nuovo_orario2;
                    return azioniIntentHandler.handle(handlerInput);
                }
            } else if(orario.includes("alba") || orario.includes("MO")){
                if(sessionAttributes.sveglia){
                    return handlerInput.responseBuilder
                    .addDelegateDirective({
                        name: 'confermaSvegliaIntent',
                        confirmationStatus: 'NONE',
                        slots: {}
                    })
                    .getResponse();
                }else{
                    return azioniIntentHandler.handle(handlerInput);
                }
            }else{
                if(sessionAttributes.sveglia){
                    sessionAttributes.oraSveglia = orario;
                    return handlerInput.responseBuilder
                    .addDelegateDirective({
                        name: 'confermaSvegliaIntent',
                        confirmationStatus: 'NONE',
                        slots: {}
                    })
                    .getResponse();
                }else{
                    sessionAttributes['ora'] = orario;
                    attributesManager.setPersistentAttributes(sessionAttributes);
                    if(sessionAttributes.riprogrammare) return salvaRoutineIntentHandler.handle(handlerInput);
                    if(sessionAttributes.modAvvio !== null && sessionAttributes.modAvvio !== "") return salvaRoutineIntentHandler.handle(handlerInput);
                    return azioniIntentHandler.handle(handlerInput);
                }
            }
        }
    }
};

const motivazioniIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'motivazioniIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Risposta utente: data di nascita");
        if (util.supportsAPL(handlerInput)) {
            const { Viewport } = handlerInput.requestEnvelope.context;
            const resolution = Viewport.pixelWidth + 'x' + Viewport.pixelHeight;
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.8',
                document: constants.APL.listDoc,
                datasources: {
                    "listData": {
                        type: 'object',
                        properties: {
                            backgroundImage: util.getS3PreSignedUrl('Media/sfondo.png'),
                            skillIcon: util.getS3PreSignedUrl('Media/waitingg.png'),
                            title: "Ecco le motivazioni disponibili",
                            list: {
                                listItems: [
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/salute.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Salute"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/intrattenimento.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Intrattenimento"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/energia.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Risparmio Energetico"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/sicurezza.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Sicurezza"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/lavoro.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Lavoro/Studio"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/riposo.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Riposo"
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            });
        }
        let speechText;
        let presente = false;
        for(let i = 0; i < sessionAttributes.utenti.length; i++)
            if(sessionAttributes.utenti[i].nome_creatore === sessionAttributes.nome_creatore) presente = true;
        if(presente && (sessionAttributes.nome === null || sessionAttributes.nome === "")) speechText= "Inserisci una motivazione per la tua routine";
        else{
            if(sessionAttributes.motivazioni.length > 0) speechText = "Inserisci la prossima motivazione";
            else speechText="Seleziona le motivazioni dalla più importante alla meno importante";
        } 
        return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .getResponse();
    }
};

// viene chiamato se il profilo utente identificato da nome_creatore non è ancora registrato
const registraCreatoreIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'registraCreatoreIntent';
    },
    handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Risposta utente: data di nascita");

        sessionAttributes['day'] = Alexa.getSlotValue(requestEnvelope, 'day');
        sessionAttributes['mese'] = Alexa.getSlotValue(requestEnvelope, 'mese');
        sessionAttributes['anno'] = Alexa.getSlotValue(requestEnvelope, 'anno');
        return motivazioniIntentHandler.handle(handlerInput);
    }
};

// viene chiamato dopo aver registrato il nome_creatore 
const registraNomeRoutineIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'registraNomeRoutineIntent';
    },
    handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        
        sessionAttributes['nome'] = Alexa.getSlotValue(requestEnvelope, 'nome');

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Risposta utente: nome routine");
        return procediIntentHandler.handle(handlerInput);
    }
};

// mi mostra elenco opzioni attivabili
const procediIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'procediIntent';
    },
    async handle(handlerInput) {
        const responseBuilder = handlerInput;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const data = new Date();

        const nome = sessionAttributes['nome'];
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        let speechText = handlerInput.t('CONTINUA', { nome: nome });
        log.push(data_stampa + "   " + "presentazione opzioni disponibili ");

        //Add APL directive to response
        if (util.supportsAPL(handlerInput)) {
            const { Viewport } = handlerInput.requestEnvelope.context;
            const resolution = Viewport.pixelWidth + 'x' + Viewport.pixelHeight;
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.8',
                document: constants.APL.listDoc,
                datasources: {
                    "listData": {
                        type: 'object',
                        properties: {
                            backgroundImage: util.getS3PreSignedUrl('Media/sfondo.png'),
                            skillIcon: util.getS3PreSignedUrl('Media/waitingg.png'),
                            headerSubTitle: "<b>la routine </b>" + "<i>" + nome + "</i>",
                            title: "Ecco le opzioni disponibili per attivare",
                            list: {
                                listItems: [
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/voice1.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Imposta comando vocale"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/calendar.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Imposta programma"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/sunrise.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Imposta alba o tramonto"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/off.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Sveglia cancellata"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/audio-waves.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Rilevamento suoni"
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            });
        }
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

// quando seleziono imposta comando vocale questo intent serve per salvare frase che attiverà routine poi mostra azioni
const touchComandoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'impostaComandoIntent';
    },
    async handle(handlerInput) {

        const data = new Date();
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;

        const f = Alexa.getSlotValue(requestEnvelope, 'frase');

        sessionAttributes['frase'] = f;

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const d = (data.getHours() + 1) + ":" + (data.getMinutes() + 20) + ":" + data.getSeconds();

        log.push(data_stampa + "   " + "Alexa chiede di impostare il comando vocale");
        log.push(d + "   " + "Risposta utente: comando vocale");
        if(sessionAttributes.modAvvio !== null && sessionAttributes.modAvvio !== "") return salvaRoutineIntentHandler.handle(handlerInput);
        return azioniIntentHandler.handle(handlerInput);
    }
};

// quando seleziono opzione programma devo specificare i giorni in cui voglio attivare routine, se avvio è con programma 
//poi mi parte intent per chiedere orario, se avvio è con alba passa a mostrarmi le azioni
const touchProgrammaHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'impostaProgramma';
    },
    handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        const avvio = sessionAttributes['avvio'];
        sessionAttributes['giorni']=[];
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giorno')) && Alexa.getSlotValue(requestEnvelope, 'giorno') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giorno'));
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giornoDue')) && Alexa.getSlotValue(requestEnvelope, 'giornoDue') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giornoDue'));
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giornoTre')) && Alexa.getSlotValue(requestEnvelope, 'giornoTre') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giornoTre'));
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giornoQuattro')) && Alexa.getSlotValue(requestEnvelope, 'giornoQuattro') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giornoQuattro'));
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giornoCinque')) && Alexa.getSlotValue(requestEnvelope, 'giornoCinque') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giornoCinque'));
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giornoSei')) && Alexa.getSlotValue(requestEnvelope, 'giornoSei') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giornoSei'));
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giornoSette')) && Alexa.getSlotValue(requestEnvelope, 'giornoSette') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giornoSette'));

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const d = (data.getHours() + 1) + ":" + (data.getMinutes() + 20) + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Alexa chiede i giorni ");
        log.push(d + "   " + "Risposta utente: giorni");
        let speechText = "A che ora vuoi impostare la routine?";
        /*return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();*/
        return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'smistaOrarioIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'ora': {
                            name: 'ora',
                            confirmationStatus: 'NONE'
                          }
                }
            })
            .getResponse();
    }
};

// quando seleziono opzione alba
const touchAlbaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'impostaAlbaIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;

        const data = new Date();
        if(Alexa.getSlotValue(requestEnvelope, 'fascia').includes("tramonto")) sessionAttributes['alba_tramonto'] = "tramonto";
        else sessionAttributes['alba_tramonto'] = "alba";
            
        
        return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'impostaGiorniAlbaIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'giorno': {
                            name: 'giorno',
                            confirmationStatus: 'NONE'
                          },
                           'giornoDue': {
                            name: 'giornoDue',
                            confirmationStatus: 'NONE'
                          },
                           'giornoTre': {
                            name: 'giornoTre',
                            confirmationStatus: 'NONE'
                          },
                          'giornoQuattro': {
                            name: 'giornoQuattro',
                            confirmationStatus: 'NONE'
                          },
                           'giornoCinque': {
                            name: 'giornoCinque',
                            confirmationStatus: 'NONE'
                          },
                           'giornoSei': {
                            name: 'giornoSei',
                            confirmationStatus: 'NONE'
                          },
                          'giornoSette': {
                            name: 'giornoSette',
                            confirmationStatus: 'NONE'
                          }
                }
            })
            .getResponse();
    }
};

//imposta giorni per alba/tramonto
const impostaGiorniAlbaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'impostaGiorniAlbaIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        
        sessionAttributes['giorni']=[];
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giorno')) && Alexa.getSlotValue(requestEnvelope, 'giorno') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giorno'));
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giornoDue')) && Alexa.getSlotValue(requestEnvelope, 'giornoDue') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giornoDue'));
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giornoTre')) && Alexa.getSlotValue(requestEnvelope, 'giornoTre') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giornoTre'));
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giornoQuattro')) && Alexa.getSlotValue(requestEnvelope, 'giornoQuattro') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giornoQuattro'));
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giornoCinque')) && Alexa.getSlotValue(requestEnvelope, 'giornoCinque') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giornoCinque'));
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giornoSei')) && Alexa.getSlotValue(requestEnvelope, 'giornoSei') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giornoSei'));
        if(!sessionAttributes.giorni.includes(Alexa.getSlotValue(requestEnvelope, 'giornoSette')) && Alexa.getSlotValue(requestEnvelope, 'giornoSette') !== undefined)sessionAttributes['giorni'].push(Alexa.getSlotValue(requestEnvelope, 'giornoSette'));
        
        if(sessionAttributes.riprogrammare) return salvaRoutineIntentHandler.handle(handlerInput);
        if(sessionAttributes.modAvvio !== null && sessionAttributes.modAvvio !== "") return salvaRoutineIntentHandler.handle(handlerInput);
        return azioniIntentHandler.handle(handlerInput);
    }
};

// mi mostra elenco suoni disponibili per rilevamento
const rilevamentoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'rilevamentoIntent';
    },
    async handle(handlerInput) {
        const responseBuilder = handlerInput;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const data = new Date();

        // recupera 
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        let speechText;

        const nome = sessionAttributes['nome'];
        speechText = handlerInput.t('MSG_SUONI');
        //Add APL directive to response
        if (util.supportsAPL(handlerInput)) {
            const { Viewport } = handlerInput.requestEnvelope.context;
            const resolution = Viewport.pixelWidth + 'x' + Viewport.pixelHeight;
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.8',
                document: constants.APL.listDoc,
                datasources: {
                    "listData": {
                        type: 'object',
                        properties: {
                            backgroundImage: util.getS3PreSignedUrl('Media/sfondo.png'),
                            skillIcon: util.getS3PreSignedUrl('Media/waitingg.png'),
                            headerSubTitle: "<b>la routine </b>" + "<i>" + nome + "</i>",
                            title: "Ecco i suoni disponibili per attivare",
                            list: {
                                listItems: [
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/crying.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Bambino che piange"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/cough.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Tosse"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/dog.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Cane che abbaia"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/water-drops.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Rumore dell'acqua"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/sleep.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Persona che russa"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/smart-washing-machine.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Segnale da elettrodomestico"
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            });
        }
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

// serve per impostare l'orario dei giorni in cui attivare routine per l'opzione programma
const impostaOrarioIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'impostaOrario';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        const data = new Date();
        
        const orario = Alexa.getSlotValue(requestEnvelope, 'ora');
        if(sessionAttributes.sveglia)
            sessionAttributes.oraSveglia = orario;
        else
            sessionAttributes['ora'] = orario;

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Risposta utente : orario ");

        if (orario >= "01:00" && orario <= "12:30") {
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'domandaIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .getResponse();
        } else {
            if(sessionAttributes.riprogrammare) return salvaRoutineIntentHandler.handle(handlerInput);
            if(sessionAttributes.sveglia === true)
                return handlerInput.responseBuilder
                    .addDelegateDirective({
                        name: 'confermaSvegliaIntent',
                        confirmationStatus: 'NONE',
                        slots: {}
                    })
                    .getResponse();
            else{
                if(sessionAttributes.modAvvio !== null && sessionAttributes.modAvvio !== "") return salvaRoutineIntentHandler.handle(handlerInput);
                return azioniIntentHandler.handle(handlerInput);
            }
        }
    }
};

// serve per impostare l'orario dei giorni in cui attivare routine per l'opzione programma
const utenteSalvatoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'utenteSalvatoIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Utente salvato ");
        salvaUtente(handlerInput);
        return motivazioniIntentHandler.handle(handlerInput);
        /*
        return handlerInput.responseBuilder
            .speak("Profilo utente salvato correttamente.")
            .addDelegateDirective({
                name: 'registraNomeRoutineIntent',
                confirmationStatus: 'NONE',
                slots: {}
            })
            .getResponse();*/
    }
};

//salva utente nel DB
function salvaUtente(handlerInput){
    const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const { intent } = requestEnvelope.request;
    //salva nuovo profilo utente
    if (!sessionAttributes.hasOwnProperty('utenti')) sessionAttributes.utenti = [];
    var nuovoUtente = {
        'nome_creatore' : sessionAttributes['nome_creatore'],
        'motivazioni' : sessionAttributes['motivazioni'],
        'day' : sessionAttributes['day'],
        'mese' : sessionAttributes['mese'],
        'anno' : sessionAttributes['anno'],
    };
    sessionAttributes.utenti.push(nuovoUtente);
    sessionAttributes.motivazioni = [];
}

//quando dico salute a voce
const saluteIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'saluteIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        const data = new Date();
        
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Motivazione utente : salute ");
        
        sessionAttributes.motivazione = "Salute";
        if(!sessionAttributes.hasOwnProperty('motivazioni')) sessionAttributes.motivazioni = [];
        if(!sessionAttributes.motivazioni.includes("Salute") && sessionAttributes.motivazioni.length < 6) sessionAttributes.motivazioni.push("Salute");
        
        if(sessionAttributes.motivazioni.length === 6){
            return handlerInput.responseBuilder
                .speak("Pronuncia salva utente per salvare il nuovo profilo creato")
                .reprompt(handlerInput.t('REPROMPT_MSG'))
                .getResponse();
        } else{
            let presente = false;
            for (let i = 0; i < sessionAttributes.utenti.length; i++) 
                if(sessionAttributes.utenti[i].nome_creatore === sessionAttributes.nome_creatore) presente = true;
            if(presente)
                return handlerInput.responseBuilder
                .speak("Pronuncia procedi per proseguire")
                .reprompt(handlerInput.t('REPROMPT_MSG'))
                .getResponse(); 
            else 
                return motivazioniIntentHandler.handle(handlerInput);
        }
    }
};

//quando dico intrattenimento a voce
const intrattenimentoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'intrattenimentoIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        const data = new Date();
        
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Motivazione utente : intrattenimento ");
        
        sessionAttributes.motivazione = "Intrattenimento";
        if(!sessionAttributes.hasOwnProperty('motivazioni')) sessionAttributes.motivazioni = [];
        if(!sessionAttributes.motivazioni.includes("Intrattenimento") && sessionAttributes.motivazioni.length < 6) sessionAttributes.motivazioni.push("Intrattenimento");
        if(sessionAttributes.motivazioni.length === 6){
            return handlerInput.responseBuilder
                .speak("Pronuncia salva utente per salvare il nuovo profilo creato")
                .reprompt(handlerInput.t('REPROMPT_MSG'))
                .getResponse();
        } else{
            let presente = false;
            for (let i = 0; i < sessionAttributes.utenti.length; i++) 
                if(sessionAttributes.utenti[i].nome_creatore === sessionAttributes.nome_creatore) presente = true;
            if(presente)
                return handlerInput.responseBuilder
                .speak("Pronuncia procedi per proseguire")
                .reprompt(handlerInput.t('REPROMPT_MSG'))
                .getResponse(); 
            else 
                return motivazioniIntentHandler.handle(handlerInput);
        }
    }
};

//quando dico risparmio energetico a voce
const risparmioEnergeticoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'risparmioEnergeticoIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        const data = new Date();
        
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Motivazione utente : risparmio Energetico ");
        
        sessionAttributes.motivazione = "Risparmio Energetico";
        if (!sessionAttributes.hasOwnProperty('motivazioni')) sessionAttributes.motivazioni = [];
        if(!sessionAttributes.motivazioni.includes("Risparmio Energetico") && sessionAttributes.motivazioni.length < 6) sessionAttributes.motivazioni.push("Risparmio Energetico");
        if(sessionAttributes.motivazioni.length === 6){
            return handlerInput.responseBuilder
                .speak("Pronuncia salva utente per salvare il nuovo profilo creato")
                .reprompt(handlerInput.t('REPROMPT_MSG'))
                .getResponse();
        } else{
            let presente = false;
            for (let i = 0; i < sessionAttributes.utenti.length; i++) 
                if(sessionAttributes.utenti[i].nome_creatore === sessionAttributes.nome_creatore) presente = true;
            if(presente)
                return handlerInput.responseBuilder
                .speak("Pronuncia procedi per proseguire")
                .reprompt(handlerInput.t('REPROMPT_MSG'))
                .getResponse(); 
            else 
                return motivazioniIntentHandler.handle(handlerInput);
        }
    }
};

//quando dico sicurezza a voce
const sicurezzaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'sicurezzaIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        const data = new Date();
        
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Motivazione utente : sicurezza ");
        
        sessionAttributes.motivazione = "Sicurezza";
        if(!sessionAttributes.hasOwnProperty('motivazioni')) sessionAttributes.motivazioni = [];
        if(!sessionAttributes.motivazioni.includes("Sicurezza") && sessionAttributes.motivazioni.length < 6) sessionAttributes.motivazioni.push("Sicurezza");
        if(sessionAttributes.motivazioni.length === 6){
            return handlerInput.responseBuilder
                .speak("Pronuncia salva utente per salvare il nuovo profilo creato")
                .reprompt(handlerInput.t('REPROMPT_MSG'))
                .getResponse();
        } else{
            let presente = false;
            for (let i = 0; i < sessionAttributes.utenti.length; i++) 
                if(sessionAttributes.utenti[i].nome_creatore === sessionAttributes.nome_creatore) presente = true;
            if(presente)
                return handlerInput.responseBuilder
                .speak("Pronuncia procedi per proseguire")
                .reprompt(handlerInput.t('REPROMPT_MSG'))
                .getResponse(); 
            else 
                return motivazioniIntentHandler.handle(handlerInput);
        }
    }
};

//quando dico lavoro a voce
const lavoroIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'lavoroIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        const data = new Date();
        
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Motivazione utente : lavoro ");
        
        sessionAttributes.motivazione = "Lavoro";
        if(!sessionAttributes.hasOwnProperty('motivazioni')) sessionAttributes.motivazioni = [];
        if(!sessionAttributes.motivazioni.includes("Lavoro") && sessionAttributes.motivazioni.length < 6) sessionAttributes.motivazioni.push("Lavoro");
        
        if(sessionAttributes.motivazioni.length === 6){
            return handlerInput.responseBuilder
                .speak("Pronuncia salva utente per salvare il nuovo profilo creato")
                .reprompt(handlerInput.t('REPROMPT_MSG'))
                .getResponse();
        } else{
            let presente = false;
            for (let i = 0; i < sessionAttributes.utenti.length; i++) 
                if(sessionAttributes.utenti[i].nome_creatore === sessionAttributes.nome_creatore) presente = true;
            if(presente)
                return handlerInput.responseBuilder
                .speak("Pronuncia procedi per proseguire")
                .reprompt(handlerInput.t('REPROMPT_MSG'))
                .getResponse(); 
            else 
                return motivazioniIntentHandler.handle(handlerInput);
        }
    }
};

//quando dico riposo a voce
const riposoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'riposoIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        const data = new Date();
        
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Motivazione utente : riposo ");
        
        sessionAttributes.motivazione = "Riposo";
        if(!sessionAttributes.hasOwnProperty('motivazioni')) sessionAttributes.motivazioni = [];
        if(!sessionAttributes.motivazioni.includes("Riposo") && sessionAttributes.motivazioni.length < 6) sessionAttributes.motivazioni.push("Riposo");
        
        if(sessionAttributes.motivazioni.length === 6){
            return handlerInput.responseBuilder
                .speak("Pronuncia salva utente per salvare il nuovo profilo creato")
                .reprompt(handlerInput.t('REPROMPT_MSG'))
                .getResponse();
        } else{
            let presente = false;
            for (let i = 0; i < sessionAttributes.utenti.length; i++) 
                if(sessionAttributes.utenti[i].nome_creatore === sessionAttributes.nome_creatore) presente = true;
            if(presente)
                return handlerInput.responseBuilder
                .speak("Pronuncia procedi per proseguire")
                .reprompt(handlerInput.t('REPROMPT_MSG'))
                .getResponse(); 
            else 
                return motivazioniIntentHandler.handle(handlerInput);
        }
    }
};

// quando dico procedi dopo aver selezionato un opzione per modalità di avvio, serve per attivare intent corrispondente
const smistaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'smistaIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const data = new Date();

        if(sessionAttributes.avvio === null || sessionAttributes.avvio === "") 
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'registraNomeRoutineIntent',
                    confirmationStatus: 'NONE',
                    slots: {
                        'nome': {
                            name: 'nome',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
        
        const avvio = sessionAttributes['avvio'];
        
        if(sessionAttributes.rispostaUtente === "riprogramma" || sessionAttributes.rispostaUtenteConflittoPossibile === "riprogramma" || sessionAttributes.rispostaUtenteQuesito === "riprogramma"){
            if(sessionAttributes.vincitore === sessionAttributes.nome_creatore)
                return quesitoIntenzioniUtenteIntentHandler.handle(handlerInput);
            else
                return risoluzioneConflittoEsplicitoIntentHandler.handle(handlerInput);
        }
        else if (avvio === 'comando vocale') {
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'impostaComandoIntent',
                    confirmationStatus: 'NONE',
                    slots: {
                        'frase': {
                            name: 'frase',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
        } else if(avvio === 'programma'){
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'impostaProgramma',
                    confirmationStatus: 'NONE',
                    slots: {
                        'giorno': {
                            name: 'giorno',
                            confirmationStatus: 'NONE'
                          },
                           'giornoDue': {
                            name: 'giornoDue',
                            confirmationStatus: 'NONE'
                          },
                           'giornoTre': {
                            name: 'giornoTre',
                            confirmationStatus: 'NONE'
                          },
                          'giornoQuattro': {
                            name: 'giornoQuattro',
                            confirmationStatus: 'NONE'
                          },
                           'giornoCinque': {
                            name: 'giornoCinque',
                            confirmationStatus: 'NONE'
                          },
                           'giornoSei': {
                            name: 'giornoSei',
                            confirmationStatus: 'NONE'
                          },
                          'giornoSette': {
                            name: 'giornoSette',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
        }else if(avvio === 'alba'){
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'impostaAlbaIntent',
                    confirmationStatus: 'NONE',
                    slots: {
                        'fascia': {
                            name: 'fascia',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
        }  else if (avvio === 'cancella sveglia') {
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'cancellaSvegliaIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .getResponse();
        } else if (avvio === 'rilevamento') {
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'rilevamentoIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .getResponse();
        }
    }
};

// quando ad alta voce pronuncio opzione comando vocale
const comandoVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'comandoVoceIntent';
    },
    handle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        sessionAttributes['avvio'] = "comando vocale";
        
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const scelta = "Imposta comando vocale";
        //log.push(data_stampa+ "   " + scelta);
        return smistaIntentHandler.handle(handlerInput);
    }
};

// quando ad alta voce pronuncio opzione alba
const albaVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'albaVoceIntent';
    },
    handle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        sessionAttributes['avvio'] = "alba";
        const data = new Date();

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const scelta = "imposta alba/tramonto"
        log.push(data_stampa + "   " + scelta);
        
        if(sessionAttributes.nome === null || sessionAttributes.nome === "") 
            return registraNomeRoutineIntentHandler.handle(handlerInput);
        else 
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'impostaAlbaIntent',
                    confirmationStatus: 'NONE',
                    slots: {
                        'fascia': {
                            name: 'fascia',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
    }
};

// quando ad alta voce pronuncio opzione programma
const programmaVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'programmaVoceIntent';
    },
    handle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        const data = new Date();
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        sessionAttributes['avvio'] = "programma";

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const scelta = "imposta programma";
        log.push(data_stampa + "   " + scelta);
        
        if(sessionAttributes.nome === null || sessionAttributes.nome === "") 
            return registraNomeRoutineIntentHandler.handle(handlerInput);
        else 
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'impostaProgramma',
                    confirmationStatus: 'NONE',
                    slots: {
                        'giorno': {
                            name: 'giorno',
                            confirmationStatus: 'NONE'
                          },
                           'giornoDue': {
                            name: 'giornoDue',
                            confirmationStatus: 'NONE'
                          },
                           'giornoTre': {
                            name: 'giornoTre',
                            confirmationStatus: 'NONE'
                          },
                          'giornoQuattro': {
                            name: 'giornoQuattro',
                            confirmationStatus: 'NONE'
                          },
                           'giornoCinque': {
                            name: 'giornoCinque',
                            confirmationStatus: 'NONE'
                          },
                           'giornoSei': {
                            name: 'giornoSei',
                            confirmationStatus: 'NONE'
                          },
                          'giornoSette': {
                            name: 'giornoSette',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
    }
};

// quando ad alta voce pronuncio rilevamento suoni
const rilevamentoVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'rilevamentoVoceIntent';
    },
    handle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        sessionAttributes['avvio'] = "rilevamento";

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const scelta = "rilevamento suoni";
        log.push(data_stampa + "   " + scelta);

        return rilevamentoIntentHandler.handle(handlerInput);
    }
};

// quando seleziono sveglia cancellata
const touchSvegliaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'cancellaSvegliaIntent';
    },
    handle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        const data = new Date();
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        sessionAttributes['avvio'] = "cancella sveglia";

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const scelta = "cancella sveglia";
        log.push(data_stampa + "   " + scelta);
        if(sessionAttributes.modAvvio !== null && sessionAttributes.modAvvio !== "") return salvaRoutineIntentHandler.handle(handlerInput);
        return azioniIntentHandler.handle(handlerInput);
    }
};

// quando utente a dice a voce opzione sveglia cancellata 
const svegliaCancellataVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'svegliaCancellataVoceIntent';
    },
    handle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        sessionAttributes['avvio'] = "cancella sveglia";

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const scelta = "sveglia cancellata";
        log.push(data_stampa + "   " + scelta);

        return smistaIntentHandler.handle(handlerInput);
    }
};

// a seconda dell'opzione selezionata mi setta i parametri
const TouchIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'Alexa.Presentation.APL.UserEvent';
    },
    async handle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();

        const { azione } = sessionAttributes;
        const { suono } = sessionAttributes;

        let scelta = request.arguments[0];
        let indice = request.arguments[1];
        const [p] = request.arguments;

        console.log('Touch event arguments: ' + scelta);

        let speechText;
        
        if(scelta.startsWith("mod")){
            if(indice === 1){
                sessionAttributes.modAvvio = estraiEvent(scelta);
                return handlerInput.responseBuilder
                .speak("Pronuncia modifica per modificare la modalità d'avvio della routine")
                .reprompt(handlerInput.t('REPROMPT_MSG'))
                .getResponse();
            }
            sessionAttributes.modAzione = estraiEvent(scelta);
            return handlerInput.responseBuilder
            .speak("Pronuncia elimina oppure modifica per eliminare o per modificare l'azione selezionata")
            .reprompt(handlerInput.t('REPROMPT_MSG'))
            .getResponse();
        }
        if(scelta === "Rinuncia"){
            log.push(data_stampa + "   " + scelta);
            return rinunciaIntentHandler.handle(handlerInput);
        }else if(scelta === "Riprogramma"){
            log.push(data_stampa + "   " + scelta);
            sessionAttributes.riprogrammare = true;
            return handlerInput.responseBuilder
            .speak("Pronuncia procedi per continuare")
            .reprompt(handlerInput.t('REPROMPT_MSG'))
            .getResponse();
        } else if(scelta === "Ignora"){
            log.push(data_stampa + "   " + scelta);
            return ignoraIntentHandler.handle(handlerInput);
        } else if(scelta === "Risolvi"){
            log.push(data_stampa + "   " + scelta);
            return risolviIntentHandler.handle(handlerInput);
        } else if(scelta === "Salva comunque"){
            log.push(data_stampa + "   " + scelta);
            return salvaComunqueIntentHandler.handle(handlerInput);
        } else if(scelta === "Salute"){
            sessionAttributes['motivazione'] = scelta;
            log.push(data_stampa + "   " + scelta);
            return saluteIntentHandler.handle(handlerInput);
        } else if (scelta === 'Intrattenimento') {
            sessionAttributes['motivazione'] = scelta;
            log.push(data_stampa + "   " + scelta);
            return intrattenimentoIntentHandler.handle(handlerInput);
        } else if (scelta === 'Risparmio Energetico') {
            sessionAttributes['motivazione'] = scelta;
            log.push(data_stampa + "   " + scelta);
            return risparmioEnergeticoIntentHandler.handle(handlerInput);
        } else if (scelta === 'Sicurezza') {
            sessionAttributes['motivazione'] = scelta;
            log.push(data_stampa + "   " + scelta);
            return sicurezzaIntentHandler.handle(handlerInput);
        } else if (scelta === 'Lavoro/Studio') {
            sessionAttributes['motivazione'] = "Lavoro";
            log.push(data_stampa + "   " + scelta);
            return lavoroIntentHandler.handle(handlerInput);
        }else if (scelta === 'Riposo') {
            sessionAttributes['motivazione'] = scelta;
            log.push(data_stampa + "   " + scelta);
            return riposoIntentHandler.handle(handlerInput);
        }else if (scelta === 'Imposta comando vocale') {
            // memorizzo che è stato scelto come avvio comando vocale
            sessionAttributes['avvio'] = "comando vocale";
            speechText = handlerInput.t('LIST_OPZIONE_DETAIL_MSG', { person: scelta });
            log.push(data_stampa + "   " + scelta);
        } else if (scelta === 'Imposta programma') {
            sessionAttributes['avvio'] = "programma";
            speechText = handlerInput.t('LIST_OPZIONE_DETAIL_MSG', { person: scelta });
            log.push(data_stampa + "   " + scelta);
        } else if (scelta === 'Imposta alba o tramonto') {
            sessionAttributes['avvio'] = "alba";
            speechText = handlerInput.t('LIST_OPZIONE_DETAIL_MSG', { person: scelta });
            log.push(data_stampa + "   " + scelta);
        } else if (scelta === 'Sveglia cancellata') {
            sessionAttributes['avvio'] = "cancella sveglia";
            speechText = handlerInput.t('MSG_SVEGLIA_CANCELLATA', { person: scelta });
            log.push(data_stampa + "   " + scelta);
        } else if (scelta === 'Rilevamento suoni') {
            sessionAttributes['avvio'] = "rilevamento";
            speechText = handlerInput.t('LIST_OPZIONE_DETAIL_MSG', { person: scelta });
            log.push(data_stampa + "   " + scelta);
            return rilevamentoVoceIntentHandler.handle(handlerInput);
        } else if (scelta === 'Bambino che piange') {
            speechText = handlerInput.t('MSG_RILEVAMENTO', { person: scelta });
            speechText += handlerInput.t('MSG_CONFERMASUONO');
            sessionAttributes.suono = scelta;
            log.push(data_stampa + "   " + scelta);
            return bambinoVoceIntentHandler.handle(handlerInput);
        } else if (scelta === 'Tosse') {
            speechText = handlerInput.t('MSG_RILEVAMENTO', { person: scelta });
            speechText += handlerInput.t('MSG_CONFERMASUONO');
            sessionAttributes.suono = scelta;
            log.push(data_stampa + "   " + scelta);
            return tosseVoceIntentHandler.handle(handlerInput);
        } else if (scelta === 'Cane che abbaia') {
            speechText = handlerInput.t('MSG_RILEVAMENTO', { person: scelta });
            speechText += handlerInput.t('MSG_CONFERMASUONO');
            sessionAttributes.suono = scelta;
            log.push(data_stampa + "   " + scelta);
            return caneVoceIntentHandler.handle(handlerInput);
        } else if (scelta === 'Rumore dell\'acqua') {
            speechText = handlerInput.t('MSG_RILEVAMENTO', { person: scelta });
            speechText += handlerInput.t('MSG_CONFERMASUONO');
            sessionAttributes.suono = scelta;
            log.push(data_stampa + "   " + scelta);
            return acquaVoceIntentHandler.handle(handlerInput);
        } else if (scelta === 'Persona che russa') {
            speechText = handlerInput.t('MSG_RILEVAMENTO', { person: scelta });
            speechText += handlerInput.t('MSG_CONFERMASUONO');
            sessionAttributes.suono = scelta;
            log.push(data_stampa + "   " + scelta);
            return russareVoceIntentHandler.handle(handlerInput);
        } else if (scelta === 'Segnale da elettrodomestico') {
            speechText = handlerInput.t('MSG_RILEVAMENTO', { person: scelta });
            speechText += handlerInput.t('MSG_CONFERMASUONO');
            sessionAttributes.suono = scelta;
            log.push(data_stampa + "   " + scelta);
            return elettrodomesticoVoceIntentHandler.handle(handlerInput);
        } else if (scelta === 'Appuntamenti') {
            sessionAttributes.azioneScelta = true;
            sessionAttributes.azione = scelta;
            log.push(data_stampa + "   " + scelta);
            return azioniIntentHandler.handle(handlerInput);
        } else if (scelta === 'Previsioni del tempo') {
            sessionAttributes.azioneScelta = true;
            sessionAttributes.azione = scelta;
            log.push(data_stampa + "   " + scelta);
            return azioniIntentHandler.handle(handlerInput);
        } else if (scelta === 'Musica') {
            sessionAttributes.azioneScelta = true;
            sessionAttributes.azione = scelta;
            log.push(data_stampa + "   " + scelta);
            return azioniIntentHandler.handle(handlerInput);
        } else if (scelta === 'Sveglia') {
            sessionAttributes.azioneScelta = true;
            sessionAttributes.azione = scelta;
            log.push(data_stampa + "   " + scelta);
            return azioniIntentHandler.handle(handlerInput);
        } else if (scelta === 'Fai dire qualcosa') {
            sessionAttributes.azioneScelta = true;
            sessionAttributes.azione = scelta;
            log.push(data_stampa + "   " + scelta);
            return azioniIntentHandler.handle(handlerInput);
        } else if (scelta === 'Traffico') {
            sessionAttributes.azioneScelta = true;
            sessionAttributes.azione = scelta;
            log.push(data_stampa + "   " + scelta);
            return azioniIntentHandler.handle(handlerInput);
        } else if (scelta === 'Televisione') {
            sessionAttributes.azioneScelta = true;
            sessionAttributes.azione = scelta;
            log.push(data_stampa + "   " + scelta);
            return azioniIntentHandler.handle(handlerInput);
        } else if (scelta === 'Luci') {
            sessionAttributes.azioneScelta = true;
            sessionAttributes.azione = scelta;
            log.push(data_stampa + "   " + scelta);
            return azioniIntentHandler.handle(handlerInput);
        } else if (scelta === 'Termostato') {
            sessionAttributes.azioneScelta = true;
            sessionAttributes.azione = scelta;
            log.push(data_stampa + "   " + scelta);
            return azioniIntentHandler.handle(handlerInput);
        } else if (scelta === 'Tapparelle') {
            sessionAttributes.azioneScelta = true;
            sessionAttributes.azione = scelta;
            log.push(data_stampa + "   " + scelta);
            return azioniIntentHandler.handle(handlerInput);
        } 
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('REPROMPT_MSG'))
            .getResponse();
    }
};

//quando non sono precisa mi chiede se l'orario è di mattina o di sera
const domandaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'domandaIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        let speechText = "Di mattina o di pomeriggio?";
       return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

// mi mostra l'lenco delle azioni che posso aggiungere alla mia routine
const azioniIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'azioniIntent';
    },
    async handle(handlerInput) {

        const data = new Date();
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        const nome = sessionAttributes['nome'];

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "presentazione delle azioni");
        let speechText = "";
        if(sessionAttributes.riprogrammare) return salvaRoutineIntentHandler.handle(handlerInput);
        if(sessionAttributes.azioneScelta){
            sessionAttributes.azioneScelta = false;
            speechText = "Hai selezionato " + sessionAttributes.azione + handlerInput.t('MSG_CONFERMA');
        }
        else if(sessionAttributes.eliminaAzione && sessionAttributes.azioni.length === 0) speechText += "Impossibile salvare una routine senza azione. Selezionare un'azione.";
        else if(sessionAttributes.modificaAzione && sessionAttributes.confirmation) speechText += "Ok, azione modificata. Seleziona un'altra azione oppure pronuncia salva routine per salvare le modifiche";
        else if(sessionAttributes.azione !== null && sessionAttributes.azione !== "" && sessionAttributes.confirmation) speechText += "Ok, azione aggiunta." + handlerInput.t('AGGIUNGI_AZIONE_O_SALVA');
        else if(sessionAttributes.azione !== undefined && sessionAttributes.azione !== null && sessionAttributes.azione !== ""  && !sessionAttributes.confirmation) speechText += "Azione non aggiunta. Selezionare un'altra azione."
        else speechText += handlerInput.t('AZIONI', { nome: nome });
        sessionAttributes.confirmation = false;
        sessionAttributes.eliminaAzione = false;
        sessionAttributes.modificaAzione = false;
        
        if (util.supportsAPL(handlerInput)) {
            const { Viewport } = handlerInput.requestEnvelope.context;
            const resolution = Viewport.pixelWidth + 'x' + Viewport.pixelHeight;
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.8',
                document: constants.APL.listDoc,
                datasources: {
                    "listData": {
                        type: 'object',
                        properties: {
                            backgroundImage: util.getS3PreSignedUrl('Media/sfondo.png'),
                            skillIcon: util.getS3PreSignedUrl('Media/waitingg.png'),
                            title: "Ecco le azioni che puoi aggiungere",
                            headerSubTitle: "<b>alla routine </b>" + "<i>" + nome + "</i>",
                            hintText: "Per terminare pronuncia <b>salva routine </b>",
                            list: {
                                listItems: [
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/appointment.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Appuntamenti"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/cloudy.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Previsioni del tempo"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/music.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Musica"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/alarm.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Sveglia"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/speech-bubble.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Fai dire qualcosa"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/traffic-jam.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Traffico"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/tv-screen.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Televisione"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/light.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Luci"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/heating.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Termostato"
                                        }
                                    },
                                    {
                                        picture: {
                                            value: util.getS3PreSignedUrl('Media/blinds.png')
                                        },
                                        option: {
                                            type: "literal",
                                            value: "Tapparelle"
                                        }
                                    },
                                ]
                            },
                        }
                    }
                }
            });
        }
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('REPROMPT_MSG'))
            .getResponse();
    }
};

//quando dico AGGIUNGI mi parte questo intent che controlla quale sia l'azione attuale selezionata e aggiorna 
const aggiungiAzioneIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'aggiungiAzioneIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const data = new Date();

        const azione = sessionAttributes['azione'];

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + " utente ha detto aggiungi");

        if (azione === 'Previsioni del tempo') {
            sessionAttributes['tempo'] = true;
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'tempoVoceIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'dispositivo': {
                            name: 'dispositivo',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        }
                }
            })
            .getResponse();
        } else if (azione === 'Appuntamenti') {
            sessionAttributes['appuntamenti'] = true;
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'appuntamentiVoceIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'dispositivo': {
                            name: 'dispositivo',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        }
                }
            })
            .getResponse();
        } else if (azione === 'Musica') {
            sessionAttributes['musica'] = true;
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'musicaVoceIntent',
                confirmationStatus: 'NONE',
                slots: {}
            })
            .getResponse();
        } else if (azione === 'Traffico') {
            sessionAttributes['traffico'] = true;
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'trafficoVoceIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'dispositivo': {
                            name: 'dispositivo',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        }
                }
            })
            .getResponse();
        }else if (azione === 'Sveglia') {
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'svegliaVoceIntent',
                confirmationStatus: 'NONE',
                slots: {}
            })
            .getResponse();
        }else if (azione === 'Luci') {
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'luciVoceIntent',
                confirmationStatus: 'NONE',
                slots: {}
            })
            .getResponse();
        }else if (azione === 'Televisione') {
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'televisioneVoceIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'azioneTv': {
                    name: 'azioneTv',
                    confirmationStatus: 'NONE'
                  },
                      'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                      }
                }
            })
            .getResponse();
        }else if (azione === 'Termostato') {
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'termostatoVoceIntent',
                confirmationStatus: 'NONE',
                slots: {}
            })
            .getResponse();
        }else if (azione === 'Tapparelle') {
            sessionAttributes['traffico'] = true;
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'tapparelleVoceIntent',
                confirmationStatus: 'NONE',
                slots: {}
            })
            .getResponse();
        }else if (azione === 'Fai dire qualcosa') {
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'alexaDiceVoceIntent',
                confirmationStatus: 'NONE',
                slots: {}
            })
            .getResponse();
        }
    }
};

// quando dico bambino che piange a voce 
const bambinoVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'bambinoVoceIntent';
    },
    async handle(handlerInput) {

        const { request } = handlerInput.requestEnvelope;
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        sessionAttributes['suono'] = 'Bambino che piange';
        
        if(sessionAttributes.modAvvio !== null && sessionAttributes.modAvvio !== "") return salvaRoutineIntentHandler.handle(handlerInput);
        return azioniIntentHandler.handle(handlerInput);
    }
};

// quando dico bambino che piange a voce 
const tosseVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'tosseVoceIntent';
    },
    async handle(handlerInput) {

        const { request } = handlerInput.requestEnvelope;
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        sessionAttributes['suono'] = 'Tosse';
        
        if(sessionAttributes.modAvvio !== null && sessionAttributes.modAvvio !== "") return salvaRoutineIntentHandler.handle(handlerInput);
        return azioniIntentHandler.handle(handlerInput);
    }
};

// quando dico cane che abbaia a voce 
const caneVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'caneVoceIntent';
    },
    async handle(handlerInput) {

        const { request } = handlerInput.requestEnvelope;
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        sessionAttributes['suono'] = 'Cane che abbaia';
        
        if(sessionAttributes.modAvvio !== null && sessionAttributes.modAvvio !== "") return salvaRoutineIntentHandler.handle(handlerInput);
        return azioniIntentHandler.handle(handlerInput);
    }
};

// quando dico rumore dell'acqua a voce 
const acquaVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'acquaVoceIntent';
    },
    async handle(handlerInput) {

        const { request } = handlerInput.requestEnvelope;
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        sessionAttributes['suono'] = "Rumore dell'acqua";
        
        if(sessionAttributes.modAvvio !== null && sessionAttributes.modAvvio !== "") return salvaRoutineIntentHandler.handle(handlerInput);
        return azioniIntentHandler.handle(handlerInput);
    }
};

// quando dico persona che russa a voce 
const russareVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'russareVoceIntent';
    },
    async handle(handlerInput) {

        const { request } = handlerInput.requestEnvelope;
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        sessionAttributes['suono'] = "Persona che russa";
        
        if(sessionAttributes.modAvvio !== null && sessionAttributes.modAvvio !== "") return salvaRoutineIntentHandler.handle(handlerInput);
        return azioniIntentHandler.handle(handlerInput);
    }
};

// quando dico elettrodomestico a voce 
const elettrodomesticoVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'elettrodomesticoVoceIntent';
    },
    async handle(handlerInput) {

        const { request } = handlerInput.requestEnvelope;
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();

        sessionAttributes['suono'] = "Segnale da elettrodomestico";
        
        if(sessionAttributes.modAvvio !== null && sessionAttributes.modAvvio !== "") return salvaRoutineIntentHandler.handle(handlerInput);
        return azioniIntentHandler.handle(handlerInput);
    }
};


// quando dico traffico a voce 
const trafficoVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'trafficoVoceIntent';
    },
    async handle(handlerInput) {

        const { request } = handlerInput.requestEnvelope;
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const person = "Traffico";
        const { azione } = sessionAttributes;
        sessionAttributes.azione = person;
        log.push(data_stampa + "   " + "scelta utente: traffico");
        
        if (intent.confirmationStatus === 'CONFIRMED') {
            sessionAttributes.confirmation = true;
            sessionAttributes.dispositivo = estraiDispositivo(Alexa.getSlotValue(requestEnvelope, 'dispositivo'));
            sessionAttributes.stanza = estraiStanza(Alexa.getSlotValue(requestEnvelope, 'stanza'));
            aggiungiAzione(handlerInput, sessionAttributes['azione'], 0, sessionAttributes['dispositivo'], sessionAttributes.stanza, null, null, "audio", "on");
        } 
        return azioniIntentHandler.handle(handlerInput);
    }
};

// quando dico appuntamenti a voce 
const appuntamentiVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'appuntamentiVoceIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const person = "Appuntamenti";
        const { azione } = sessionAttributes;
        sessionAttributes.azione = person;

        log.push(data_stampa + "   " + "scelta utente: Appuntamenti");
        if (intent.confirmationStatus === 'CONFIRMED') {
            sessionAttributes.dispositivo = estraiDispositivo(Alexa.getSlotValue(requestEnvelope, 'dispositivo'));
            sessionAttributes.stanza = estraiStanza(Alexa.getSlotValue(requestEnvelope, 'stanza'));
            sessionAttributes.confirmation = true;
            aggiungiAzione(handlerInput, sessionAttributes['azione'], 0, sessionAttributes['dispositivo'], sessionAttributes.stanza, null, null, null, "audio", "on");
        }
        return azioniIntentHandler.handle(handlerInput);
    }
};

// quando dico musica a voce
const musicaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'musicaIntent';
    },
    async handle(handlerInput) {

        const { request } = handlerInput.requestEnvelope;
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        sessionAttributes.azione = "Musica";

        log.push(data_stampa + "   " + "scelta utente: musica");
        
        if (intent.confirmationStatus === 'CONFIRMED') {
            sessionAttributes.dispositivo = estraiDispositivo(Alexa.getSlotValue(requestEnvelope, 'dispositivo'));
            sessionAttributes.durata = parseInt(Alexa.getSlotValue(requestEnvelope, 'durata'));
            sessionAttributes.stanza = estraiStanza(Alexa.getSlotValue(requestEnvelope, 'stanza'));
            sessionAttributes.confirmation = true;
            aggiungiAzione(handlerInput, sessionAttributes['azione'], sessionAttributes['durata'], sessionAttributes['dispositivo'], sessionAttributes.stanza, null, null, "audio", "on");
        }
        return azioniIntentHandler.handle(handlerInput);
    }
};

//quando dico musica ad alta voce
const musicaVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'musicaVoceIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const person = "Musica";
        sessionAttributes.azione = person;

        let speechText = handlerInput.t('MSG_MUSICA1', { person: person });

        log.push(data_stampa + "   " + "scelta utente: Musica");
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('REPROMPT_MSG'))
            .addDelegateDirective({
                name: 'musicaIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'dispositivo': {
                            name: 'dispositivo',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        },
                    'durata': {
                        name: 'durata',
                        confirmationStatus: 'NONE'
                      }
                }
            })
            .getResponse();
    }
};

// quando dico tempo a voce 
const tempoVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'tempoVoceIntent';
    },
    async handle(handlerInput) {

        const { request } = handlerInput.requestEnvelope;
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const person = "Previsioni del tempo";
        const { azione } = sessionAttributes;
        sessionAttributes.azione = person;
        log.push(data_stampa + "   " + "scelta utente: previsioni");
        
        if (intent.confirmationStatus === 'CONFIRMED') {
            sessionAttributes.dispositivo = estraiDispositivo(Alexa.getSlotValue(requestEnvelope, 'dispositivo'));
            sessionAttributes.stanza = estraiStanza(Alexa.getSlotValue(requestEnvelope, 'stanza'));
            sessionAttributes.confirmation = true;
            aggiungiAzione(handlerInput, sessionAttributes['azione'], 0, sessionAttributes['dispositivo'], sessionAttributes.stanza, null, null, "audio", "on");
        }
        return azioniIntentHandler.handle(handlerInput);
    }
};

// quando dico musica a voce 
const alexaDiceVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'alexaDiceVoceIntent';
    },
    async handle(handlerInput) {

        const { request } = handlerInput.requestEnvelope;
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const person = "Fai dire qualcosa";
        const { azione } = sessionAttributes;
        sessionAttributes.azione = person;

        let speechText = handlerInput.t('MSG_ALEXA1', { person: person });

        log.push(data_stampa + "   " + "scelta utente: alexa dice");

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('REPROMPT_MSG'))
            .addDelegateDirective({
                name: 'alexaDiceIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'dispositivo': {
                            name: 'dispositivo',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        },
                    'alexa_frase': {
                        name: 'alexa_frase',
                        confirmationStatus: 'NONE'
                      }
                }
            })
            .getResponse();
    }
};

// quando dico sveglia a voce alta
const svegliaVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'svegliaVoceIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const person = "Sveglia";
        sessionAttributes['azione'] = person;
        sessionAttributes.sveglia = true;

        let speechText = handlerInput.t('MSG_SVEGLIA1', { person: person });

        log.push(data_stampa + "   " + "scelta utente: sveglia");
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('REPROMPT_MSG'))
            .addDelegateDirective({
                name: 'smistaOrarioIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'ora': {
                            name: 'ora',
                            confirmationStatus: 'NONE'
                          }
                }
            })
            .getResponse();
    }
};

// quando dico televisione a voce 
const televisioneVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'televisioneVoceIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const person = "Televisione";
        sessionAttributes['azione'] = person;
        let speechText = handlerInput.t('MSG_TV1', { person: person });

        log.push(data_stampa + "   " + "scelta utente: smart tv");
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('REPROMPT_MSG'))
            .addDelegateDirective({
                name: 'televisioneIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'azioneTv': {
                            name: 'azioneTv',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        }
                }
            })
            .getResponse();
    }
};

// quando dico luci a voce alta
const luciVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'luciVoceIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const person = "Luci";
        sessionAttributes.azione = person;

        let speechText = handlerInput.t('MSG_LUCI1', { person: person });

        log.push(data_stampa + "   " + "scelta utente: luci");
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('REPROMPT_MSG'))
            .addDelegateDirective({
                name: 'luciIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'azione': {
                            name: 'azione',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        },
                    'tipo_luce': {
                        name: 'tipo_luce',
                        confirmationStatus: 'NONE'
                      }
                }
            })
            .getResponse();
    }
};

// quando dico termostato a voce alta
const termostatoVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'termostatoVoceIntent';
    },
    async handle(handlerInput) {

        const { request } = handlerInput.requestEnvelope;
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        let speechText;
        const person = "Termostato";
        const { azione } = sessionAttributes;
        sessionAttributes.azione = person;

        speechText = handlerInput.t('MSG_TERMOSTATO1', { person: person });

        log.push(data_stampa + "   " + "scelta utente: termostato");
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(handlerInput.t('REPROMPT_MSG'))
            .addDelegateDirective({
                name: 'termostatoIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'temperatura': {
                            name: 'temperatura',
                            confirmationStatus: 'NONE'
                          }
                }
            })
            .getResponse();
    }
};

// per impostare la televisione
const televisioneIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'televisioneIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        const data = new Date();
        sessionAttributes['tv'] = true;
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const d = (data.getHours() + 1) + ":" + (data.getMinutes() + 20) + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Alexa chiede per impostare televisione");
        log.push(d + "   " + "Risposta utente: impostazione");
        if (intent.confirmationStatus === 'CONFIRMED'){
            sessionAttributes.tipologia_azione = Alexa.getSlotValue(requestEnvelope, 'azioneTv');
            sessionAttributes.stanza = estraiStanza(Alexa.getSlotValue(requestEnvelope, 'stanza'));
            sessionAttributes.confirmation = true;
            if(sessionAttributes.tipologia_azione.startsWith("spe"))
                aggiungiAzione(handlerInput, sessionAttributes['azione'], 45, "televisore", sessionAttributes.stanza, null, null, "audio", "off");
            else
                aggiungiAzione(handlerInput, sessionAttributes['azione'], 45, "televisore", sessionAttributes.stanza, null, null, "audio", "on");
        }
        return azioniIntentHandler.handle(handlerInput);
    }
};

// per scegliere l'azione relativa alle tapparelle e in quale stanza
const tapparelleIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'tapparelleIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        const data = new Date();

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const d = (data.getHours() + 1) + ":" + (data.getMinutes() + 20) + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Alexa chiede impostazione tapparelle");
        log.push(d + "   " + "Risposta utente: tapparelle");
        sessionAttributes.azione = "Tapparelle";
        
        if (intent.confirmationStatus === 'CONFIRMED'){
            sessionAttributes.confirmation = true;
            sessionAttributes.tipologia_azione = Alexa.getSlotValue(requestEnvelope, 'azione');
            sessionAttributes.stanza = estraiStanza(Alexa.getSlotValue(requestEnvelope, 'stanza'));
            if(sessionAttributes.tipologia_azione.startsWith("chi")  || sessionAttributes.tipologia_azione.startsWith("abb"))
                aggiungiAzione(handlerInput, sessionAttributes['azione'], 30, "tapparelle", sessionAttributes['stanza'], null, null, null, "down");
            else
                aggiungiAzione(handlerInput, sessionAttributes['azione'], 30, "tapparelle", sessionAttributes['stanza'], null, null, null, "up");
        }
        return azioniIntentHandler.handle(handlerInput);
    }
};

// per impostare la temperatura del termostato
const termostatoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'termostatoIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;

        const data = new Date();

        const f = Alexa.getSlotValue(requestEnvelope, 'temperatura');
        sessionAttributes['temperatura'] = f;
        sessionAttributes.azione = "Termostato";

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const d = (data.getHours() + 1) + ":" + (data.getMinutes() + 20) + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Alexa chiede per impostare termostato");
        log.push(d + "   " + "Risposta utente: temperatura");
        
         if (intent.confirmationStatus === 'CONFIRMED'){
            sessionAttributes.confirmation = true;
            aggiungiAzione(handlerInput, sessionAttributes['azione'], 120, "termostato", "casa", null, null, "temperatura", sessionAttributes['temperatura']);
        }
        return azioniIntentHandler.handle(handlerInput);
    }
};

//estrae il nome dell'azione/modalità d'attivazione selezionata dall'utente
function estraiEvent(scelta){
    if(scelta.includes("Programma")) return "programma";
    else if(scelta.includes("alba") || scelta.includes("tramonto")) return "alba";
    else if(scelta.includes("comando vocale")) return "comando vocale";
    else if(scelta.includes("cancel")) return "cancella sveglia";
    else if(scelta.includes("rileverà")) return "rilevamento";
    else if(scelta.includes("appuntamenti")) return "Appuntamenti";
    else if(scelta.includes("tempo")) return "Previsioni del tempo";
    else if(scelta.includes("musica")) return "Musica";
    else if(scelta.includes("Ti sveglia")) return "Sveglia";
    else if(scelta.includes("barzelletta") || scelta.includes("canzone") || scelta.includes("storia") || scelta.includes("dice")) return "Fai dire qualcosa";
    else if(scelta.includes("traffico")) return "Traffico";
    else if(scelta.includes("televisione")) return "Televisione";
    else if(scelta.includes("luce")) return "Luci";
    else if(scelta.includes("termostato")) return "Termostato";
    else if(scelta.includes("tapparelle")) return "Tapparelle";
    else return scelta;
}

//uniforma il nome del dispositivo, ad esempio televisore e tele -> tele
function estraiDispositivo(dispositivo){
        if(dispositivo.includes("tele") || dispositivo.includes("tv")) return "tele";
        else if(dispositivo.includes("show")) return "echo show";
        else if(dispositivo.includes("stereo")) return "stereo";
        else if(dispositivo.includes("dot")) return "echo dot";
        else if(dispositivo.includes("comodino")) return "comodino";
        else if(dispositivo.includes("lavandino")) return "lavandino";
        else return "soffitto";
}

//estrae il nome della stanza dalla stringa che può essere del tipo "in cucina" oppure "televisione soggiorno"
function estraiStanza(stanza){
    if(stanza.includes("soggiorno")) return "soggiorno";
    else if(stanza.includes("cucina")) return "cucina";
    else if(stanza.includes("cameretta")) return "cameretta";
    else if(stanza.includes("camera da letto")) return "camera da letto";
    else if(stanza.includes("taverna")) return "taverna";
    else if(stanza.includes("cantina")) return "cantina";
    else if(stanza.includes("bagno")) return "bagno";
    else if(stanza.includes("ingresso")) return "ingresso";
    else return "corridoio";
}

// fornisce riassunto di quanto creato    
const terminaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'terminaIntent';
    },
    async handle(handlerInput) {
        const responseBuilder = handlerInput;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        const data = new Date();
        const nome = sessionAttributes['nome'];
        const avvio = sessionAttributes['avvio'];
        sessionAttributes.azione = "";
        if(sessionAttributes.azioni.length === 0) return azioniIntentHandler.handle(handlerInput);
        let speechText = "";
        if(sessionAttributes.eliminaAzione) speechText += "L'azione " + sessionAttributes.modAzione + " è stata eliminata correttamente.<break time='0.3s'/> "
        var elenco = [];
        var elencoIcone = [];
        for (let j = 0; j < v.listData.properties.list.listItems.length; j++) {
            v.listData.properties.list.listItems[j].option.value = "";
            v.listData.properties.list.listItems[j].picture.value = "";
        }

        speechText += handlerInput.t('MSG_FINE', { nome: nome });
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "riassunto finale");

        if (avvio === 'comando vocale') {
            const frase = sessionAttributes['frase'];
            speechText += handlerInput.t('MSG_VOCALE2', { frase: frase });
            elenco.push("Attivata con il comando vocale: "+ frase);
            elencoIcone.push(util.getS3PreSignedUrl("Media/voice1.png"));
        } else if (avvio === 'programma') {
            let giorni = "";
            for(let i = 0; i < sessionAttributes.giorni.length; i++)
                if(sessionAttributes.giorni[i] !== null && sessionAttributes.giorni[i] !== undefined) giorni += sessionAttributes.giorni[i] + ", ";
            giorni = giorni.slice(0, -2);
            speechText += "che verrà attivata " + giorni;
            const ora = sessionAttributes['ora'];
            speechText += " " + handlerInput.t('MSG_ORE', { ora: ora });
            elenco.push("Programmata per "+ giorni + " alle ore "+ ora);
            elencoIcone.push(util.getS3PreSignedUrl("Media/calendar.png"));
        } else if (avvio === 'alba') {
            const mod = sessionAttributes['alba_tramonto'];
            let giorni = "";
            for(let i = 0; i < sessionAttributes.giorni.length; i++)
                if(sessionAttributes.giorni[i] !== null && sessionAttributes.giorni[i] !== undefined) giorni += sessionAttributes.giorni[i] + ", ";
            giorni = giorni.slice(0, -2);
            speechText += "che verrà attivata " + giorni;
            if (mod === 'alba' || mod === 'all\'alba') {
                elenco.push("Attivata all'alba " + giorni);
                speechText += " all'alba";
            }
            else{
                elenco.push("Attivata al tramonto "+ giorni);
                speechText += ' al tramonto';
            }
            elencoIcone.push(util.getS3PreSignedUrl("Media/sunrise.png"))
        } else if (avvio === 'cancella sveglia') {
            speechText += 'che verrà attivata quando cancellerai la sveglia';
            elenco.push("Attivata quando cancellerai la sveglia ");
            elencoIcone.push(util.getS3PreSignedUrl("Media/off.png"));
        }
        else if (avvio === 'rilevamento') {
            speechText += handlerInput.t('MSG_SUONIFINALE', { suono: sessionAttributes['suono'] });
            elenco.push("Attivata quando rileverà:  "  + sessionAttributes['suono']);
            elencoIcone.push(util.getS3PreSignedUrl("Media/audio-waves.png"));
        }
        speechText += '. Con questa routine Alexa ';
        
        for(let i = 0; i < sessionAttributes.azioni.length; i++){
            if (sessionAttributes.azioni[i].nomeAzione === "Appuntamenti") {
                speechText += 'ti leggerà gli appuntamenti del giorno <break time="0.3s"/> ';
                elenco.push("Legge gli appuntamenti del giorno");
                elencoIcone.push(util.getS3PreSignedUrl("Media/appointment.png"));
            } else if (sessionAttributes.azioni[i].nomeAzione === "Previsioni del tempo") {
                speechText += ' ti dirà le previsioni del tempo <break time="0.3s"/> ';
                elenco.push("Dice le previsioni del tempo");
                elencoIcone.push(util.getS3PreSignedUrl("Media/cloudy.png"));
            } else if (sessionAttributes.azioni[i].nomeAzione === "Musica") {
                speechText += ' riprodurrà musica per '+ sessionAttributes.azioni[i].durata + " minuti da "  + sessionAttributes.azioni[i].dispositivo + " in " + sessionAttributes.azioni[i].stanza + '<break time="0.3s"/> ';
                elenco.push("Riproduce musica per " + sessionAttributes.azioni[i].durata + " minuti da " + sessionAttributes.azioni[i].dispositivo + " in " + sessionAttributes.azioni[i].stanza);
                elencoIcone.push(util.getS3PreSignedUrl("Media/music.png"));
            } else if (sessionAttributes.azioni[i].nomeAzione === "Sveglia") {
                speechText += handlerInput.t('AlexaSveglia', { oraSveglia: sessionAttributes['oraSveglia'] });
                elenco.push("Ti sveglia alle ore "+ sessionAttributes['oraSveglia']);
                elencoIcone.push(util.getS3PreSignedUrl("Media/alarm.png"))
            } else if (sessionAttributes.azioni[i].nomeAzione === "Fai dire qualcosa") {
                const frase = sessionAttributes['alexaFrase'];
                if (frase.includes("barzelletta")){
                    elenco.push("Alexa racconta una barzelletta");
                    speechText += ' ti racconterà una barzelletta<break time="0.3s"/> ';
                }
                else if (frase.includes("canzone")){
                    speechText += ' ti canterà una canzone<break time="0.3s"/> ';
                    elenco.push("Alexa canta una canzone");
                }
                else if (frase.includes("storia")) {
                    speechText += ' ti racconterà una storia<break time="0.3s"/>';
                    elenco.push("Alexa racconta una storia");
                }
                else {
                    speechText += handlerInput.t('AlexaDice', { frase: frase });
                    elenco.push("Alexa dice "+ frase);
                }
                elencoIcone.push(util.getS3PreSignedUrl("Media/speech-bubble.png"));
            } else if (sessionAttributes.azioni[i].nomeAzione === "Traffico") {
                speechText += 'ti fornirà informazioni sul traffico<break time="0.3s"/> ';
                elenco.push("Informa sul traffico");
                elencoIcone.push(util.getS3PreSignedUrl("Media/traffic-jam.png"));
            } else if (sessionAttributes.azioni[i].nomeAzione === "Televisione") {
                if (sessionAttributes.azioni[i].valoreVarAmbientale === "on"){
                    elenco.push("Accende la televisione in " + sessionAttributes.azioni[i].stanza);
                    speechText += 'Accenderà la televisione in ' + sessionAttributes.azioni[i].stanza + '<break time="0.3s"/> ';
                }
                else{
                    speechText += 'Spegnerà la televisione in ' + sessionAttributes.azioni[i].stanza + '<break time="0.3s"/> ';
                    elenco.push("Spegne la televisione in " + sessionAttributes.azioni[i].stanza);
                }
                elencoIcone.push(util.getS3PreSignedUrl("Media/tv-screen.png"));
            } else if (sessionAttributes.azioni[i].nomeAzione === "Luci") {
                if (sessionAttributes.azioni[i].valoreVarAmbientale === "off" ){
                    elenco.push("Spegne la luce del "+ sessionAttributes.azioni[i].dispositivo + " in " + sessionAttributes.azioni[i].stanza);
                    speechText += " Spegnerà la luce del " + sessionAttributes.azioni[i].dispositivo + " in " + sessionAttributes.azioni[i].stanza + '<break time="0.3s"/> ';
                } 
                else{
                    elenco.push("Accende la luce del "+ sessionAttributes.azioni[i].dispositivo + " in " + sessionAttributes.azioni[i].stanza);
                    speechText += " Accenderà la luce del " + sessionAttributes.azioni[i].dispositivo + " in " + sessionAttributes.azioni[i].stanza + '<break time="0.3s"/> ';
                } 
                elencoIcone.push(util.getS3PreSignedUrl("Media/light.png"));
            } else if (sessionAttributes.azioni[i].nomeAzione === "Termostato"){
                speechText += handlerInput.t('TERMOSTATO', { temperatura: sessionAttributes.azioni[i].valoreVarAmbientale });
                elenco.push("Imposta il termostato a "+ sessionAttributes.azioni[i].valoreVarAmbientale +" gradi");
                elencoIcone.push(util.getS3PreSignedUrl("Media/heating.png"));
            } else if (sessionAttributes.azioni[i].nomeAzione === "Tapparelle"){
                if (sessionAttributes.azioni[i].valoreVarAmbientale === "down"){
                    elenco.push("Abbassa le tapparelle in "+ sessionAttributes.azioni[i].stanza);
                    speechText += " abbasserà le tapparelle in " + sessionAttributes.azioni[i].stanza + '<break time="0.3s"/> ';
                } 
                else{
                    elenco.push("Alza le tapparelle in "+ sessionAttributes.azioni[i].stanza);
                    speechText += " alzerà le tapparelle in " + sessionAttributes.azioni[i].stanza + '<break time="0.3s"/> ';
                }
                elencoIcone.push(util.getS3PreSignedUrl("Media/blinds.png"));
            }
        }
        
        v.listData.properties.backgroundImage = util.getS3PreSignedUrl('Media/sfondo.png');
        v.listData.properties.skillIcon = util.getS3PreSignedUrl('Media/waitingg.png');

        for (let j = 0; j < elenco.length; j++){
            v.listData.properties.list.listItems[j].option.value = elenco[j];
            v.listData.properties.list.listItems[j].picture.value = elencoIcone[j];
        } 
            
        speechText += handlerInput.t('MSG_MODIFICA');
        speechText += handlerInput.t('MSG_INIZIA_NUOVA_ROUTINE');
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.8',
                document: require('./documents/verti.json'),
                datasources: v,
            })
            .getResponse();
    }
};

//quando dico tapparelle a voce
const tapparelleVoceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'tapparelleVoceIntent';
    },
    async handle(handlerInput) {

        const { request } = handlerInput.requestEnvelope;
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        let speechText;
        const person = "Tapparelle";
        const { azione } = sessionAttributes;
        sessionAttributes.azione = person;

        speechText = handlerInput.t('MSG_TAPPARELLE1', { person: person });
        log.push(data_stampa + "   " + "scelta utente: tapparelle");
        
        return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(handlerInput.t('REPROMPT_MSG'))
            .addDelegateDirective({
                name: 'tapparelleIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'azione': {
                            name: 'azione',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        }
                }
            })
            .getResponse();
    }
};

// per impostare l'ora in cui suonerà la sveglia se non è precisa rimanda a domandaIntent
const svegliaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'svegliaIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        const data = new Date();

        let speechText = "Ok, azione aggiunta.";
        speechText += handlerInput.t('AGGIUNGI_AZIONE_O_SALVA');

        const ora = Alexa.getSlotValue(requestEnvelope, 'ora_sveglia');
        sessionAttributes['oraSveglia'] = ora;
        sessionAttributes['sveglia'] = true;
        sessionAttributes.azione = "Sveglia";

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const d = (data.getHours() + 1) + ":" + (data.getMinutes() + 20) + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Alexa chiede ora sveglia");
        log.push(d + "   " + "Risposta utente: ora sveglia");
        if (ora >= "01:00" && ora <= "12:30") {
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'domandaIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .getResponse();
        } else 
            return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'confermaSvegliaIntent',
                    confirmationStatus: 'NONE',
                    slots: {}
                })
                .getResponse();
    }
};

const confermaSvegliaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'confermaSvegliaIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        
        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const d = (data.getHours() + 1) + ":" + (data.getMinutes() + 20) + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Alexa chiede conferma sveglia");
        log.push(d + "   " + "Risposta utente: conferma sveglia");
        sessionAttributes.sveglia = false;
        
        if(sessionAttributes.riprogrammare) return salvaRoutineIntentHandler.handle(handlerInput);
        
        if (intent.confirmationStatus === 'CONFIRMED'){
            sessionAttributes.confirmation = true;
            aggiungiAzione(handlerInput, sessionAttributes['azione'], 0, null, null, null, sessionAttributes['oraSveglia'], null, null);
        }
        return azioniIntentHandler.handle(handlerInput);
    }
};

// per impostare quello che dovrà dire alexa
const alexaDiceIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'alexaDiceIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;

        sessionAttributes['alexa'] = true;
        sessionAttributes.azione = "Fai dire qualcosa";
        const data = new Date();

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const d = (data.getHours() + 1) + ":" + (data.getMinutes() + 20) + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Alexa chiede per impostare alexa dice");
        log.push(d + "   " + "Risposta utente: frase alexa dice");
        
        if (intent.confirmationStatus === 'CONFIRMED'){
            sessionAttributes.confirmation = true;
            sessionAttributes.dispositivo = estraiDispositivo(Alexa.getSlotValue(requestEnvelope, 'dispositivo'));
            sessionAttributes['alexaFrase'] = Alexa.getSlotValue(requestEnvelope, 'alexa_frase');
            sessionAttributes.stanza = estraiStanza(Alexa.getSlotValue(requestEnvelope, 'stanza'));
            aggiungiAzione(handlerInput, sessionAttributes['azione'], 0, sessionAttributes['dispositivo'], sessionAttributes.stanza, sessionAttributes['alexaFrase'], null, "audio", "on");
        }
        return azioniIntentHandler.handle(handlerInput);
    }
};

// per scegliere la stanza, il tipo e l'azione relativa le luci 
const luciIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'luciIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        const data = new Date();

        sessionAttributes.azione = "Luci";

        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        const d = (data.getHours() + 1) + ":" + (data.getMinutes() + 10) + ":" + data.getSeconds();
        log.push(data_stampa + "   " + "Alexa chiede per impostare luci");
        log.push(d + "   " + "Risposta utente: impostazione luci");
        
        if (intent.confirmationStatus === 'CONFIRMED'){
            sessionAttributes.tipologia_azione = Alexa.getSlotValue(requestEnvelope, 'azione');
            sessionAttributes.tipologia_luce = estraiDispositivo(Alexa.getSlotValue(requestEnvelope, 'tipo_luce'));
            sessionAttributes.stanza = estraiStanza(Alexa.getSlotValue(requestEnvelope, 'stanza'));
            sessionAttributes.confirmation = true;
            if(sessionAttributes.tipologia_azione.startsWith("spe")){
                aggiungiAzione(handlerInput, sessionAttributes['azione'], 30, sessionAttributes['tipologia_luce'], sessionAttributes['stanza'], null, null, "illuminazione", "off");
            }else
                aggiungiAzione(handlerInput, sessionAttributes['azione'], 30, sessionAttributes['tipologia_luce'], sessionAttributes['stanza'], null, null, "illuminazione", "on");
        }
        return azioniIntentHandler.handle(handlerInput);
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

function resetAttributes(handlerInput) {
    
    const responseBuilder = handlerInput;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes['nome'] = "";
    sessionAttributes['id'] = "";
    sessionAttributes['avvio'] = "";
    sessionAttributes['azione'] = "";
    sessionAttributes['tempo'] = "";
    sessionAttributes['appuntamenti'] = "";
    sessionAttributes['traffico'] = "";
    sessionAttributes['sveglia'] = "";
    sessionAttributes['oraSveglia'] = "";
    sessionAttributes['ora'] = "";
    sessionAttributes['musica'] = "";
    sessionAttributes['alexa'] = "";
    sessionAttributes['stanza'] = "";
    sessionAttributes['alexaFrase'] = "";
    sessionAttributes['alba_tramonto'] = "";
    sessionAttributes['temperatura'] = "";
    sessionAttributes['frase'] = "";
    sessionAttributes['giorni'] = [];
    sessionAttributes['indice'] = "";
    sessionAttributes['fascia'] = "";
    sessionAttributes['suono'] = "";
    sessionAttributes['tv'] = "";
    sessionAttributes['tvAzione'] = "";
    sessionAttributes['day'] = "";
    sessionAttributes['mese'] = "";
    sessionAttributes['anno'] = "";
    sessionAttributes['azioni'] = [];
    sessionAttributes['motivazioni'] = [];
    sessionAttributes['motivazione'] = "";
    sessionAttributes['nome_creatore'] = "";
    sessionAttributes['durata'] = "";
    sessionAttributes['confirmation'] = "";
    sessionAttributes['azioniConflittuali'] = [];
    sessionAttributes['rispostaUtente'] = "";
    sessionAttributes['rispostaUtenteConflittoPossibile'] = "";
    sessionAttributes['riprogrammare'] = false;
    sessionAttributes['risolvere'] = false;
    sessionAttributes['dispositivo'] = "";
    sessionAttributes['durata']="";
    sessionAttributes['tipologia_luce'] = "";
    sessionAttributes['modAzione'] = "";
    sessionAttributes['modAvvio'] = "";
    sessionAttributes['azioneScelta'] = false;
    sessionAttributes['eliminaAzione'] = false;
    sessionAttributes['utenteDB'] = "";
    sessionAttributes['nomeRoutineDB'] = "";
    sessionAttributes['rispostaUtenteQuesito'] = "";
    sessionAttributes['vincitore'] = "";
    sessionAttributes['modificaAzione'] = false;
}

//permette di eliminare anche l'ultima azione della routine, lasciando così la routine vuota!
// elimina l'azione dalla routine (si presume ci sia al più un'istanza per tipo di azione - per com'è fatto il codice eliminerebbe tutte le occorrenze di quell'azione)
const eliminaAzioneIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'eliminaAzioneIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        sessionAttributes.eliminaAzione = true;
        let nomeAzione = sessionAttributes.modAzione;
        let posizioneAzione = -1;
        let posizioneRoutine = -1;
        let daEliminare = false;
        //elimino l'azione dalla routine già salvata nel db
        for(let i = 0; i < sessionAttributes.routines.length; i++){
            if(sessionAttributes.routines[i].nomeCreatore === sessionAttributes.nome_creatore && sessionAttributes.routines[i].nomeRoutine === sessionAttributes.nome){
                for(let j = 0; j < sessionAttributes.routines[i].azioni.length; j++){
                    if(sessionAttributes.routines[i].azioni[j].nomeAzione === nomeAzione){
                        posizioneAzione = j;
                        posizioneRoutine = i;
                        if(sessionAttributes.routines[i].azioni.length === 1)
                            daEliminare = true;
                    } 
                }
            }
        }
        sessionAttributes.routines[posizioneRoutine].azioni.splice(posizioneAzione, 1);
        //elimino la routine nel db se essa conteneva soltanto l'azione appena rimossa
        if(daEliminare) sessionAttributes.routines.splice(posizioneRoutine, 1);
        //elimino l'azione da sessionAttributes.azioni per rendere il riassunto finale coerente con l'eliminazione
        for(let i = 0; i < sessionAttributes.azioni.length; i++)
            if(sessionAttributes.azioni[i].nomeAzione === nomeAzione) posizioneAzione = i;
        if(posizioneAzione !== -1) sessionAttributes.azioni.splice(posizioneAzione, 1);
        attributesManager.setPersistentAttributes(sessionAttributes);
        return terminaIntentHandler.handle(handlerInput);
    }
};

//quando l'utente modifica un'azione oppure la modalità d'attivazione
const smistaModificheIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'modificaIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        let nomeEvento = sessionAttributes.modAzione;
        let nomeModAvvio = sessionAttributes.modAvvio;
        let posizioneAzione = -1;
        let posizioneRoutine = -1;
        //elimino la routine dal db, altrimenti quando salvo quella modificata me ne ritrovo due
        for(let i = 0; i < sessionAttributes.routines.length; i++){
            if(sessionAttributes.routines[i].nomeRoutine === sessionAttributes.nome && sessionAttributes.routines[i].nomeCreatore === sessionAttributes.nome_creatore)
                posizioneRoutine = i;
        }
        sessionAttributes.routines.splice(posizioneRoutine, 1);
        
        //se la modifica riguarda la modalità d'avvio
        if(nomeModAvvio === "programma" || nomeModAvvio === "alba" || nomeModAvvio === "cancella sveglia" || nomeModAvvio === "rilevamento" || nomeModAvvio === "comando vocale")
            return procediIntentHandler.handle(handlerInput);
        
        //elimino l'azione da sessionAttributes.azioni per rendere il riassunto finale coerente con l'eliminazione
        for(let i = 0; i < sessionAttributes.azioni.length; i++)
            if(sessionAttributes.azioni[i].nomeAzione === nomeEvento) posizioneAzione = i;
        sessionAttributes.azioni.splice(posizioneAzione, 1);
        attributesManager.setPersistentAttributes(sessionAttributes);
        
        sessionAttributes.modificaAzione = true;
        
        if(nomeEvento === "Musica")
            return handlerInput.responseBuilder
            .speak(handlerInput.t('MSG_MUSICA1', { person: nomeEvento }))
            .addDelegateDirective({
                name: 'musicaIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'dispositivo': {
                            name: 'dispositivo',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        },
                    'durata': {
                            name: 'durata',
                            confirmationStatus: 'NONE'
                          }
                }
            })
            .getResponse();
        else if(nomeEvento === "Appuntamenti")
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'appuntamentiVoceIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'dispositivo': {
                            name: 'dispositivo',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        }
                }
            })
            .getResponse();
         else if(nomeEvento === "Previsioni del tempo")
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'tempoVoceIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'dispositivo': {
                            name: 'dispositivo',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        }
                }
            })
            .getResponse();
        else if(nomeEvento === "Sveglia"){
            sessionAttributes.sveglia = true;
            return handlerInput.responseBuilder
            .speak(handlerInput.t('MSG_SVEGLIA1', { person: nomeEvento }))
            .addDelegateDirective({
                name: 'svegliaVoceIntent',
                confirmationStatus: 'NONE',
                slots: {}
            })
            .getResponse();
        } else if(nomeEvento === "Fai dire qualcosa")
            return handlerInput.responseBuilder
            .speak(handlerInput.t('MSG_ALEXA1', { person: nomeEvento }))
            .addDelegateDirective({
                name: 'alexaDiceIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'dispositivo': {
                            name: 'dispositivo',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        },
                    'alexa_frase': {
                            name: 'alexa_frase',
                            confirmationStatus: 'NONE'
                          }
                }
            })
            .getResponse();
        else if(nomeEvento === "Traffico")
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'trafficoVoceIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'dispositivo': {
                            name: 'dispositivo',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        }
                }
            })
            .getResponse();
        else if(nomeEvento === "Televisione")
            return handlerInput.responseBuilder
            .addDelegateDirective({
                name: 'televisioneVoceIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'azioneTv': {
                            name: 'azioneTv',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        }
                }
            })
            .getResponse();
        else if(nomeEvento === "Luci")
            return handlerInput.responseBuilder
            .speak(handlerInput.t('MSG_LUCI1', { person: nomeEvento }))
            .addDelegateDirective({
                name: 'luciIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'azione': {
                            name: 'azione',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        },
                    'tipo_luce': {
                            name: 'tipo_luce',
                            confirmationStatus: 'NONE'
                          }
                }
            })
            .getResponse();
        else if(nomeEvento === "Termostato")
            return handlerInput.responseBuilder
            .speak(handlerInput.t('MSG_TERMOSTATO1', { person: nomeEvento }))
            .addDelegateDirective({
                name: 'termostatoIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'temperatura': {
                            name: 'temperatura',
                            confirmationStatus: 'NONE'
                          }
                }
            })
            .getResponse();
        else
            return handlerInput.responseBuilder
            .speak(handlerInput.t('MSG_TAPPARELLE1', { person: nomeEvento }))
            .addDelegateDirective({
                name: 'tapparelleIntent',
                confirmationStatus: 'NONE',
                slots: {
                    'azione': {
                            name: 'azione',
                            confirmationStatus: 'NONE'
                          },
                    'stanza': {
                        name: 'stanza',
                        confirmationStatus: 'NONE'
                        }
                }
            })
            .getResponse();
    }
};

// mi mostra l'elenco delle azioni che sono state cliccate insieme all'orario
const mostraLogIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'mostraLogIntent';
    },
    async handle(handlerInput) {

        datasource.textListData.backgroundImage.sources[0].url = util.getS3PreSignedUrl('Media/sfondo.png');
        datasource.textListData.logoUrl = util.getS3PreSignedUrl('Media/waitingg.png');

        let i;
        for (i = 0; i < log.length; i++) {
            const testo = log[i];
            datasource.textListData.listItems[i].primaryText = testo;
        }

        return handlerInput.responseBuilder
            .addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.8',
                document: require('./documents/elencoFinale.json'),
                datasources: datasource,
            })
            .getResponse();
    }
};

//chiede all'utente cosa intende fare sapendo che il salvataggio della sua routine elimina/silenzia un'altra routine
const quesitoIntenzioniUtenteIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'quesitoIntenzioniUtenteIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        let speechText;
        if(sessionAttributes.rispostaUtenteQuesito.startsWith("ripro")){
            sessionAttributes.riprogrammare = true;
            if(sessionAttributes.avvio === "programma"){
                return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'impostaProgramma',
                    confirmationStatus: 'NONE',
                    slots: {
                        'giorno': {
                            name: 'giorno',
                            confirmationStatus: 'NONE'
                          },
                           'giornoDue': {
                            name: 'giornoDue',
                            confirmationStatus: 'NONE'
                          },
                           'giornoTre': {
                            name: 'giornoTre',
                            confirmationStatus: 'NONE'
                          },
                          'giornoQuattro': {
                            name: 'giornoQuattro',
                            confirmationStatus: 'NONE'
                          },
                           'giornoCinque': {
                            name: 'giornoCinque',
                            confirmationStatus: 'NONE'
                          },
                           'giornoSei': {
                            name: 'giornoSei',
                            confirmationStatus: 'NONE'
                          },
                          'giornoSette': {
                            name: 'giornoSette',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
            }else{
                return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'impostaAlbaIntent',
                    confirmationStatus: 'NONE',
                    slots: {
                        'fascia': {
                            name: 'fascia',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
            }
        }else{//procede a salvare la routine
            let posizione;
            //elimina routine perdente dal db
            for(let i = 0; i < sessionAttributes.routines.length; i++)
                if(sessionAttributes.routines[i].nomeCreatore === sessionAttributes.utenteDB && sessionAttributes.routines[i].nomeRoutine === sessionAttributes.nomeRoutineDB) 
                    posizione = i;
            sessionAttributes.routines.splice(posizione, 1);
            //mostra resoconto routine
            salvaRoutine(handlerInput);
            return terminaIntentHandler.handle(handlerInput);
        }
    }   
};

//indirizza nell'intent corretto a seconda della risposta dell'utente riguardante la risoluzione di conflitto esplicito
const risoluzioneConflittoEsplicitoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'risoluzioneConflittoEsplicitoIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        let speechText;
        if(sessionAttributes.rispostaUtente.startsWith("ripro")){
            sessionAttributes.riprogrammare = true;
            if(sessionAttributes.avvio === "programma"){
                return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'impostaProgramma',
                    confirmationStatus: 'NONE',
                    slots: {
                        'giorno': {
                            name: 'giorno',
                            confirmationStatus: 'NONE'
                          },
                           'giornoDue': {
                            name: 'giornoDue',
                            confirmationStatus: 'NONE'
                          },
                           'giornoTre': {
                            name: 'giornoTre',
                            confirmationStatus: 'NONE'
                          },
                          'giornoQuattro': {
                            name: 'giornoQuattro',
                            confirmationStatus: 'NONE'
                          },
                           'giornoCinque': {
                            name: 'giornoCinque',
                            confirmationStatus: 'NONE'
                          },
                           'giornoSei': {
                            name: 'giornoSei',
                            confirmationStatus: 'NONE'
                          },
                          'giornoSette': {
                            name: 'giornoSette',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
            }else{
                return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'impostaAlbaIntent',
                    confirmationStatus: 'NONE',
                    slots: {
                        'fascia': {
                            name: 'fascia',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
            }
        }else if(sessionAttributes.rispostaUtente.startsWith("rin")){
            return handlerInput.responseBuilder
            .speak("Creazione routine annullata. Pronuncia crea una nuova routine per ricominciare oppure esci per uscire")
            .reprompt(handlerInput.t('REPROMPT_MSG'))
            .getResponse();
        }else{//salvare comunque (senza azioni conflittuali)
            speechText = "Routine salvata senza le azioni conflittuali. ";
            for(let i = sessionAttributes.azioniConflittuali.length - 1; i >= 0; i--){
                speechText += "L'azione " + sessionAttributes.azioni[sessionAttributes.azioniConflittuali[i]].nomeAzione + " è stata rimossa. "
                sessionAttributes.azioni.splice(sessionAttributes.azioniConflittuali[i], 1);
            }
            salvaRoutine(handlerInput);
            return terminaIntentHandler.handle(handlerInput);
        }
    }   
};

//indirizza nell'intent corretto a seconda della risposta dell'utente riguardante la risoluzione di conflitto esplicito
const risoluzioneConflittoPossibileIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'risoluzioneConflittoPossibileIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        if(sessionAttributes.rispostaUtenteConflittoPossibile.startsWith("ris")){
            sessionAttributes.risolvere = true;
            return salvaRoutineIntentHandler.handle(handlerInput);
        } else if(sessionAttributes.rispostaUtenteConflittoPossibile.startsWith("rip")){
            sessionAttributes.riprogrammare = true;
            if(sessionAttributes.avvio === "programma"){
                return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'impostaProgramma',
                    confirmationStatus: 'NONE',
                    slots: {
                        'giorno': {
                            name: 'giorno',
                            confirmationStatus: 'NONE'
                          },
                           'giornoDue': {
                            name: 'giornoDue',
                            confirmationStatus: 'NONE'
                          },
                           'giornoTre': {
                            name: 'giornoTre',
                            confirmationStatus: 'NONE'
                          },
                          'giornoQuattro': {
                            name: 'giornoQuattro',
                            confirmationStatus: 'NONE'
                          },
                           'giornoCinque': {
                            name: 'giornoCinque',
                            confirmationStatus: 'NONE'
                          },
                           'giornoSei': {
                            name: 'giornoSei',
                            confirmationStatus: 'NONE'
                          },
                          'giornoSette': {
                            name: 'giornoSette',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
            }else{
                return handlerInput.responseBuilder
                .addDelegateDirective({
                    name: 'impostaAlbaIntent',
                    confirmationStatus: 'NONE',
                    slots: {
                        'fascia': {
                            name: 'fascia',
                            confirmationStatus: 'NONE'
                          }
                    }
                })
                .getResponse();
            }
        }
        else{
            salvaRoutine(handlerInput);
            return terminaIntentHandler.handle(handlerInput);
        }
    }
};

//quando pronuncio salva comunque
const salvaComunqueIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'salvaComunqueIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        sessionAttributes.rispostaUtenteQuesito = "salva";
        sessionAttributes.rispostaUtente = "salva";
        if(sessionAttributes.vincitore === sessionAttributes.nome_creatore)
            return quesitoIntenzioniUtenteIntentHandler.handle(handlerInput);
        else
            return risoluzioneConflittoEsplicitoIntentHandler.handle(handlerInput);
    }
};

//quando pronuncio riprogrammare
const riprogrammaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'riprogrammaIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        sessionAttributes.rispostaUtenteQuesito = "riprogramma";
        sessionAttributes.rispostaUtente = "riprogramma";
        sessionAttributes.rispostaUtenteConflittoPossibile = "riprogramma";
        if(sessionAttributes.vincitore === sessionAttributes.nome_creatore)
            return quesitoIntenzioniUtenteIntentHandler.handle(handlerInput);
        else
            return risoluzioneConflittoEsplicitoIntentHandler.handle(handlerInput);
    }
};

//quando pronuncio rinunciare
const rinunciaIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'rinunciaIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        sessionAttributes.rispostaUtenteQuesito = "rinuncia";
        sessionAttributes.rispostaUtente = "rinuncia";
        return handlerInput.responseBuilder
        .speak("Creazione routine annullata. Pronuncia crea una nuova routine per ricominciare oppure esci per uscire")
        .reprompt(handlerInput.t('REPROMPT_MSG'))
        .getResponse();
    }
};

//quando pronuncio risolvere
const risolviIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'risolviIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        sessionAttributes.rispostaUtenteConflittoPossibile = "risolvi";
        return risoluzioneConflittoPossibileIntentHandler.handle(handlerInput);
    }
};

//quando pronuncio ignorare
const ignoraIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ignoraIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const { intent } = requestEnvelope.request;
        sessionAttributes.rispostaUtenteConflittoPossibile = "ignora";
        return risoluzioneConflittoPossibileIntentHandler.handle(handlerInput);
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const speechText = handlerInput.t('GOODBYE_MSG');
        resetAttributes(handlerInput);

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);

        // Any cleanup logic goes here.
        resetAttributes(handlerInput);
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

//quando dico salva routine(controlla se ci sono conflitti)
const salvaRoutineIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'salvaRoutineIntent';
    },
    async handle(handlerInput) {

        const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
        const { intent } = requestEnvelope.request;
        const sessionAttributes = attributesManager.getSessionAttributes();

        const data = new Date();
        const data_stampa = (data.getHours() + 1) + ":" + data.getMinutes() + ":" + data.getSeconds();
        sessionAttributes.riprogrammare = false;
        sessionAttributes.modAvvio = "";
        let conflittoEsplicito = false;
        let conflittoPossibile = false;
        let utenteDB, motivazioneDB, nomeRoutineDB;
        let speechTextMomentoAttivazione;
        let speechTextGiorni = "";
        let azioniConflittualiDB = [];
        let routineDB = null;
        sessionAttributes['azioniConflittuali']=[];
        if (!sessionAttributes.hasOwnProperty('routines')) sessionAttributes.routines = [];
        //il controllo avviene solo se la routine corrente ha come modalità di attivazione  "programma" o "alba"
        if(sessionAttributes['avvio'] === "programma" || sessionAttributes['avvio'] === "alba"){
            let routinesDB = [];
            //carica tutte le routine presenti nel DB che hanno modalità di avvio "programma" o "alba/tramonto"
            for(let i = 0; i < sessionAttributes['routines'].length; i++)
                if((sessionAttributes.routines[i].avvio === "programma" || sessionAttributes.routines[i].avvio === "alba") && sessionAttributes.routines[i].nomeCreatore !== sessionAttributes.nome_creatore)
                    routinesDB.push(sessionAttributes.routines[i]);
                    
            for(let i = 0; i < routinesDB.length; i++){
                if(sovrapposizioneGiorni(routinesDB[i].giorni, sessionAttributes.giorni)){
                    for(let j = 0; j < routinesDB[i].azioni.length; j++){
                        for(let k = 0; k < sessionAttributes.azioni.length; k++)
                            if(routinesDB[i].azioni[j].stanza === sessionAttributes.azioni[k].stanza)
                                if(routinesDB[i].azioni[j].varAmbientale === sessionAttributes.azioni[k].varAmbientale
                                && (routinesDB[i].azioni[j].valoreVarAmbientale !== sessionAttributes.azioni[k].valoreVarAmbientale 
                                && routinesDB[i].azioni[j].dispositivo === sessionAttributes.azioni[k].dispositivo 
                                || routinesDB[i].azioni[j].valoreVarAmbientale === sessionAttributes.azioni[k].valoreVarAmbientale 
                                && routinesDB[i].azioni[j].dispositivo !== sessionAttributes.azioni[k].dispositivo
                                && routinesDB[i].azioni[j].durata !== 0 && sessionAttributes.azioni[k].durata !== 0
                                || routinesDB[i].azioni[j].valoreVarAmbientale === sessionAttributes.azioni[k].valoreVarAmbientale 
                                && routinesDB[i].azioni[j].dispositivo === sessionAttributes.azioni[k].dispositivo
                                && routinesDB[i].azioni[j].durata !== 0 && sessionAttributes.azioni[k].durata !== 0)){
                                    let orarioInizioRoutineCorrente;
                                    if(sessionAttributes.avvio === "programma") orarioInizioRoutineCorrente = sessionAttributes["ora"].split(':');
                                    else {
                                        if(sessionAttributes.alba_tramonto === "alba") orarioInizioRoutineCorrente = ["07", "45"]; //alba del 29/01 a Brescia
                                        else orarioInizioRoutineCorrente = ["17", "17"]; //tramonto del 29/01 a Brescia
                                    }
                                    let oraInizioAzioneCorrente = parseInt(orarioInizioRoutineCorrente[0])*60 + parseInt(orarioInizioRoutineCorrente[1]);
                                    let oraFineAzioneCorrente = oraInizioAzioneCorrente + sessionAttributes.azioni[k].durata;
                                    let orarioInizioRoutineDB;
                                    if(routinesDB[i].avvio === "programma") orarioInizioRoutineDB = routinesDB[i].ora.split(':');
                                    else{
                                        if(routinesDB[i].alba_tramonto === "alba") orarioInizioRoutineDB = ["07", "45"]; //alba del 29/01 a Brescia
                                        else orarioInizioRoutineDB = ["17", "17"]; //tramonto del 29/01 a Brescia
                                    }
                                    let oraInizioAzioneDB = parseInt(orarioInizioRoutineDB[0])*60 + parseInt(orarioInizioRoutineDB[1]);
                                    let oraFineAzioneDB = oraInizioAzioneDB + routinesDB[i].azioni[j].durata;
                                    
                                    /*return handlerInput.responseBuilder
                                        .speak(oraInizioAzioneCorrente.toString()+ " " + oraFineAzioneCorrente.toString()+ " " + oraInizioAzioneDB.toString()+ " " + oraFineAzioneDB.toString()+ " " )
                                        .reprompt(oraInizioAzioneCorrente.toString())
                                        .getResponse();*/
                                        
                                    if((oraInizioAzioneCorrente < oraFineAzioneDB &&  oraInizioAzioneCorrente > oraInizioAzioneDB)
                                    || (oraInizioAzioneDB < oraFineAzioneCorrente && oraInizioAzioneCorrente < oraInizioAzioneDB)){
                                        if(sessionAttributes.azioni[k].nomeAzione === "Musica" && routinesDB[i].azioni[j].nomeAzione === "Musica"
                                        || sessionAttributes.azioni[k].nomeAzione === "Musica" && oraInizioAzioneCorrente < oraInizioAzioneDB && oraFineAzioneCorrente > oraInizioAzioneDB
                                        || routinesDB[i].azioni[j].nomeAzione === "Musica" && oraInizioAzioneDB < oraInizioAzioneCorrente && oraFineAzioneDB > oraInizioAzioneCorrente){
                                            conflittoEsplicito = true;
                                            utenteDB = routinesDB[i].nomeCreatore;
                                            motivazioneDB = routinesDB[i].motivazione;
                                            nomeRoutineDB = routinesDB[i].nomeRoutine;
                                            routineDB = routinesDB[i];
                                            sessionAttributes['azioniConflittuali'].push(k);
                                            azioniConflittualiDB.push(routinesDB[i].azioni[j]);
                                        }else{
                                            conflittoPossibile = true; 
                                            nomeRoutineDB = routinesDB[i].nomeRoutine;
                                            utenteDB = routinesDB[i].nomeCreatore;
                                            motivazioneDB = routinesDB[i].motivazione;
                                            routineDB = routinesDB[i];
                                            sessionAttributes['azioniConflittuali'].push(k);
                                            azioniConflittualiDB.push(routinesDB[i].azioni[j]);
                                        }
                                    }else if(oraInizioAzioneDB === oraInizioAzioneCorrente){
                                        conflittoEsplicito = true; 
                                        nomeRoutineDB = routinesDB[i].nomeRoutine;
                                        utenteDB = routinesDB[i].nomeCreatore;
                                        motivazioneDB = routinesDB[i].motivazione;
                                        routineDB = routinesDB[i];
                                        sessionAttributes['azioniConflittuali'].push(k);
                                        azioniConflittualiDB.push(routinesDB[i].azioni[j]);
                                    } 
                                    if(conflittoEsplicito || conflittoPossibile){
                                        if(routinesDB[i].avvio === "programma") speechTextMomentoAttivazione = "alle ore " + routineDB.ora;
                                    else {
                                        if(routinesDB[i].alba_tramonto === "alba") speechTextMomentoAttivazione = "all'alba";
                                        else speechTextMomentoAttivazione = "al tramonto";
                                    }
                                    }
                                }
                    }
                }
            }
            if(routineDB !== null){
                for(let count = 0; count < routineDB.giorni.length; count++)
                    speechTextGiorni += routineDB.giorni[count] + ", ";
                speechTextGiorni = speechTextGiorni.slice(0,-2);
            }
        }
        text.listData.properties.backgroundImage = util.getS3PreSignedUrl('Media/sfondo.png');
        text.listData.properties.skillIcon = util.getS3PreSignedUrl('Media/waitingg.png');
        for (let j = 0; j < text.listData.properties.list.listItems.length; j++) {
            text.listData.properties.list.listItems[j].option.value = "";
        }
        //dopo che l'utente ha già dichiarato di voler risolvere il conflitto possibile, il conflitto possibile va considerato come effettivo
        if(conflittoEsplicito || (conflittoPossibile && sessionAttributes.risolvere)){
            sessionAttributes.risolvere = false;
            sessionAttributes.vincitore = calcolaVincitore(handlerInput, sessionAttributes.nome_creatore, utenteDB, sessionAttributes.motivazione, motivazioneDB).nome;
            if(sessionAttributes.vincitore === sessionAttributes.nome_creatore){
                sessionAttributes.utenteDB = utenteDB;
                sessionAttributes.nomeRoutineDB = nomeRoutineDB;
                let speechText = 'Il salvataggio della tua routine comporta la disattivazione della routine "' + nomeRoutineDB + '" di '  + utenteDB[0].toUpperCase() + utenteDB.slice(1) + " che è  "; 
                speechText += "programmata per azionarsi " + speechTextGiorni + " " + speechTextMomentoAttivazione + " e che ";
                for(let i = 0; i < routineDB.azioni.length; i++)
                    speechText += riepilogoAzione(routineDB.azioni[i]);
                let speechText2 = " Ecco cosa puoi fare: ";
                let elenco = ["Salva comunque", "Riprogramma", "Rinuncia"];
                for (let j = 0; j < elenco.length; j++){
                    text.listData.properties.list.listItems[j].option.value = elenco[j];
                } 
                text.listData.properties.number = "3";
                text.listData.properties.messaggio = speechText;
                text.listData.properties.opzioni = speechText2;
                if (util.supportsAPL(handlerInput)) {
                    const { Viewport } = handlerInput.requestEnvelope.context;
                    const resolution = Viewport.pixelWidth + 'x' + Viewport.pixelHeight;
                    handlerInput.responseBuilder.addDirective({
                        type: 'Alexa.Presentation.APL.RenderDocument',
                        version: '1.8',
                        document: require('./documents/text.json'), 
                        datasources: text
                    });
                }
                return handlerInput.responseBuilder
                .speak(speechText + speechText2)
                .reprompt(speechText + speechText2)
                .getResponse();
            } else{
                //chiede cosa desidera fare l'utente (rinunciare, salvare senza azioni conflittuali o riprogrammare)
                let elenco;
                let speechText = 'Impossibile creare la routine perché va in conflitto con la routine "' + nomeRoutineDB + '" creata da ' + utenteDB[0].toUpperCase() + utenteDB.slice(1) + calcolaVincitore(handlerInput, sessionAttributes.nome_creatore, utenteDB, sessionAttributes.motivazione, motivazioneDB).motivazione + ".";
                for(let i = 0; i < sessionAttributes.azioniConflittuali.length; i++)
                    speechText += " L'azione " + sessionAttributes.azioni[sessionAttributes.azioniConflittuali[i]].nomeAzione + ' nella tua routine "' + sessionAttributes.nome + '" andrà in conflitto con l\'azione ' + azioniConflittualiDB[i].nomeAzione + ' della routine "' + nomeRoutineDB + '" che ' + riepilogoAzione(azioniConflittualiDB[i]) + "<break time='0.3s'/>";
                let speechText3 = ' La routine "'  + nomeRoutineDB + '" è programmata per azionarsi ' + speechTextGiorni + " " + speechTextMomentoAttivazione + ".";
                if(sessionAttributes.azioni.length === sessionAttributes.azioniConflittuali.length){
                    elenco = ["Rinuncia", "Riprogramma"];
                    text.listData.properties.number = "2";
                } else{
                    elenco = ["Rinuncia", "Salva comunque", "Riprogramma"];
                    text.listData.properties.number = "3";
                } 
                let speechText2 = " Ecco cosa puoi fare: ";
                for (let j = 0; j < elenco.length; j++){
                    text.listData.properties.list.listItems[j].option.value = elenco[j];
                }
                text.listData.properties.messaggio = speechText;
                text.listData.properties.secondoMessaggio = speechText3;
                text.listData.properties.opzioni = speechText2;
                if (util.supportsAPL(handlerInput)) {
                    const { Viewport } = handlerInput.requestEnvelope.context;
                    const resolution = Viewport.pixelWidth + 'x' + Viewport.pixelHeight;
                    handlerInput.responseBuilder.addDirective({
                        type: 'Alexa.Presentation.APL.RenderDocument',
                        version: '1.8',
                        document: require('./documents/text.json'), 
                        datasources: text
                    });
                }
                return handlerInput.responseBuilder
                .speak(speechText + speechText3 + speechText2)
                .reprompt(speechText)
                .getResponse();
            }
        }else if(conflittoPossibile){//quii problema: aggiunge in azioniConflittuali la stessa azione più volte quando riprogrammo
            let speechText = "Conflitto possibile rilevato";
            speechText += ' con la routine "' + nomeRoutineDB + '" creata da ' + utenteDB[0].toUpperCase() + utenteDB.slice(1) + " e ";
            speechText += "programmata per azionarsi " + speechTextGiorni + " " + speechTextMomentoAttivazione + ".";
            for(let i = 0; i < sessionAttributes.azioniConflittuali.length; i++)
                speechText += " L'azione " + sessionAttributes.azioni[sessionAttributes.azioniConflittuali[i]].nomeAzione + ' nella tua routine "' + sessionAttributes.nome + '" potrebbe andare in conflitto con l\'azione ' + azioniConflittualiDB[i].nomeAzione + " che " + riepilogoAzione(azioniConflittualiDB[i]) + "<break time='0.3s'/>";
            let speechText2 = " Ecco cosa puoi fare: ";
            let elenco = ["Ignora", "Risolvi", "Rinuncia", "Riprogramma"];
            for (let j = 0; j < elenco.length; j++){
                text.listData.properties.list.listItems[j].option.value = elenco[j];
            }
            text.listData.properties.messaggio = speechText;
            text.listData.properties.opzioni = speechText2;
            text.listData.properties.number = "4";
            if (util.supportsAPL(handlerInput)) {
                    const { Viewport } = handlerInput.requestEnvelope.context;
                    const resolution = Viewport.pixelWidth + 'x' + Viewport.pixelHeight;
                    handlerInput.responseBuilder.addDirective({
                        type: 'Alexa.Presentation.APL.RenderDocument',
                        version: '1.8',
                        document: require('./documents/text.json'), 
                        datasources: text
                    });
                }
                return handlerInput.responseBuilder
                .speak(speechText + speechText2)
                .reprompt(speechText + speechText2)
                .getResponse();
        } else{
            //presenta resoconto routine
            if(sessionAttributes.azioni.length !== 0) salvaRoutine(handlerInput);
            return terminaIntentHandler.handle(handlerInput);
        }
    }
};

//ritorna una stringa che descrive l'azione 
function riepilogoAzione(azione){
    if(azione.nomeAzione === "Appuntamenti") return "legge gli appuntamenti del giorno da " + azione.dispositivo + " in " + azione.stanza + ".";
    else if(azione.nomeAzione === "Previsioni del tempo") return "dice le previsioni del tempo da " + azione.dispositivo + " in " + azione.stanza + ".";
    else if(azione.nomeAzione === "Musica") return "riproduce musica da " + azione.dispositivo + " in " + azione.stanza + " per " + azione.durata + " minuti.";
    else if(azione.nomeAzione === "Sveglia") return "ti sveglia alle ore " + azione.oraSveglia + ".";
    else if(azione.nomeAzione === "Fai dire qualcosa"){
        if(azione.alexaFrase.includes("barzelletta")) return "ti racconta una barzelletta da " + azione.dispositivo + " in " + azione.stanza + ".";
        else if(azione.alexaFrase.includes("canzone")) return "ti canta una canzone da " + azione.dispositivo + " in " + azione.stanza + ".";
        else if(azione.alexaFrase.includes("storia")) return "ti racconta una storia da " + azione.dispositivo + " in " + azione.stanza + ".";
        else return "ti dice " + azione.alexaFrase + " da " + azione.dispositivo + " in " + azione.stanza + ".";
    }
    else if(azione.nomeAzione === "Traffico") return "fornisce informazioni sul traffico da " + azione.dispositivo + " in " + azione.stanza + ".";
    else if(azione.nomeAzione === "Televisione"){
        if(azione.valoreVarAmbientale === "on") return "accende la tv in " + azione.stanza + ".";
        else return "spegne la tv in " + azione.stanza + ".";
    }
    else if(azione.nomeAzione === "Luci"){
        if(azione.valoreVarAmbientale === "on") return "accende la luce" + azione.dispositivo +  " in " + azione.stanza + ".";
        else  return "spegne la luce" + azione.dispositivo +  " in " + azione.stanza + ".";
    }
    else if(azione.nomeAzione === "Termostato") return "imposta la temperatura a " + azione.valoreVarAmbientale + " gradi.";
    else{
        if(azione.valoreVarAmbientale === "down") return "abbassa le tapparelle in " + azione.stanza + ".";
        else return "alza le tapparelle in " + azione.stanza + ".";
    }
}

//calcola il vincitore del conflitto secondo applicando le tre politiche in ordine: preferze/motivazione -> priorità -> first-arrived-first-served
function calcolaVincitore(handlerInput, nomeUtenteCorrente, nomeUtenteDB, motivazioneUtenteCorrente, motivazioneUtenteDB){
    const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    let preferenzeUtenteCorrente, preferenzeUtenteDB;
    for (let i = 0; i < sessionAttributes.utenti.length; i++) {
        if(sessionAttributes.utenti[i].nome_creatore === nomeUtenteCorrente){
            for(let j = 0; j < sessionAttributes.utenti[i].motivazioni.length; j++)
                if(sessionAttributes.utenti[i].motivazioni[j] === motivazioneUtenteCorrente) preferenzeUtenteCorrente = j;
        }
        else if(sessionAttributes.utenti[i].nome_creatore === nomeUtenteDB){
            for(let k = 0; k < sessionAttributes.utenti[i].motivazioni.length; k++)
                if(sessionAttributes.utenti[i].motivazioni[k] === motivazioneUtenteDB) preferenzeUtenteDB = k;
        }
    }
    //confronto preferenze/motivazione
    if(preferenzeUtenteCorrente < preferenzeUtenteDB) return {
        'nome' : nomeUtenteCorrente,
        'motivazione' : "la tua routine ha una motivazione più importante"
    };
    else if(preferenzeUtenteCorrente > preferenzeUtenteDB) return {
        'nome' : nomeUtenteDB,
        'motivazione' : ", che ha una motivazione più importante"
    };
    else{//confronto priorità e poi first-arrived-first-served
        if(calcolaPrioritàUtente(handlerInput, nomeUtenteCorrente) > calcolaPrioritàUtente(handlerInput, nomeUtenteDB)) return {
            'nome' : nomeUtenteCorrente,
            'motivazione' : "il tuo profilo ha maggiore priorità rispetto a quello di " + nomeUtenteDB[0].toUpperCase() + nomeUtenteDB.slice(1)
            };
        else if(calcolaPrioritàUtente(handlerInput, nomeUtenteCorrente) < calcolaPrioritàUtente(handlerInput, nomeUtenteDB)) return {
            'nome' : nomeUtenteDB,
            'motivazione' : ", il quale ha priorità maggiore"
            };
        else return {//first-arrived-first-served: vince utenteDB perchè ha creato routine prima
            'nome' : nomeUtenteDB,
            'motivazione' : "ed a parità di importanza delle motivazioni e di priorità viene preservata la routine già presente"
            }; 
    }
}

//calcola la priorità dell'utente in base all'età
// 0 -> priorità minima, 3-> priorità massima
function calcolaPrioritàUtente(handlerInput, nome){
    const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    let giorno, mese, anno;
    for (let i = 0; i < sessionAttributes.utenti.length; i++) {
            if(sessionAttributes.utenti[i].nome_creatore === nome){
                giorno = adattaGiorno(sessionAttributes.utenti[i].day);
                mese = convertiMese(sessionAttributes.utenti[i].mese.toLowerCase());
                anno = sessionAttributes.utenti[i].anno;
            }
    }
    let dataUtente = new Date(parseInt(anno), parseInt(mese) - 1, parseInt(giorno));
    var cur = new Date();
    var diff = cur - dataUtente;
    var currentAge = Math.floor(diff/31557600000);
    if(currentAge < 16) return 0; //bambino
    else if(currentAge <= 25)return 1; //giovane
    else if(currentAge < 70) return 3; //adulto
    else return 2; //anziano
    
}

//adatta giorno a formato a due cifre
function adattaGiorno(giorno){
    if(giorno<10)
        giorno = "0" + giorno;
    return giorno;
}

//converti nome mese in numero mese
function convertiMese(mese){
    if(mese === "gennaio") return 1;
    else if(mese === "febbraio") return 2;
    else if(mese === "marzo") return 3;
    else if(mese === "aprile") return 4;
    else if(mese === "maggio") return 5;
    else if(mese === "giugno") return 6;
    else if(mese === "luglio") return 7;
    else if(mese === "agosto") return 8;
    else if(mese === "settembre") return 9;
    else if(mese === "ottobre") return 10;
    else if(mese === "novembre") return 11;
    else return 12;
}

//salva la routine 
async function salvaRoutine(handlerInput){
    const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    let nuovaRoutine = {
        'nomeRoutine' : sessionAttributes.nome,
        'nomeCreatore' : sessionAttributes.nome_creatore,
        'avvio' : sessionAttributes.avvio,
        'motivazione' : sessionAttributes.motivazione,
        'giorni' : sessionAttributes.giorni,
        'ora' : sessionAttributes.ora,
        'alba_tramonto' : sessionAttributes.alba_tramonto,
        'azioni' : sessionAttributes.azioni,
    };
    sessionAttributes.routines.push(nuovaRoutine);
}

// ritorna true se almeno un giorno è in comune
function sovrapposizioneGiorni(array1, array2){
    for(let i = 0; i<array1.length; i++)
        if(array1[i] !== null)
            for(let j = 0; j<array2.length; j++)
                if(array1[i] === array2[j]) return true;
    return false;
}

//crea l'oggetto azione e lo inserisce in azioni[]
async function aggiungiAzione(handlerInput, nomeAzione, durata, dispositivo, stanza, alexaFrase, oraSveglia, varAmbientale, valoreVarAmbientale){
    
    const { attributesManager, requestEnvelope, responseBuilder } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    
    if (!sessionAttributes.hasOwnProperty('azioni')) sessionAttributes.azioni = [];
    let nuovaAzione = {
        'nomeAzione' : nomeAzione,
        'durata' : durata,
        'dispositivo' : dispositivo,
        'stanza' : stanza,
        'alexaFrase' : alexaFrase,
        'oraSveglia' : oraSveglia,
        'varAmbientale' : varAmbientale,
        'valoreVarAmbientale' : valoreVarAmbientale
    };
    sessionAttributes.azioni.push(nuovaAzione);
}

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        registraRoutineIntentHandler,
        registraCreatoreIntentHandler,
        motivazioniIntentHandler,
        utenteSalvatoIntentHandler,
        registraNomeRoutineIntentHandler,
        procediIntentHandler,
        touchComandoIntentHandler,
        comandoVoceIntentHandler,
        touchProgrammaHandler,
        programmaVoceIntentHandler,
        touchAlbaIntentHandler,
        albaVoceIntentHandler,
        //impostaOrarioIntentHandler,
        smistaOrarioIntentHandler,
        azioniIntentHandler,
        domandaIntentHandler,
        smistaIntentHandler,
        aggiungiAzioneIntentHandler,
        TouchIntentHandler,
        musicaIntentHandler,
        musicaVoceIntentHandler,
        trafficoVoceIntentHandler,
        appuntamentiVoceIntentHandler,
        tempoVoceIntentHandler,
        alexaDiceVoceIntentHandler,
        svegliaVoceIntentHandler,
        alexaDiceIntentHandler,
        svegliaIntentHandler,
        confermaSvegliaIntentHandler,
        luciVoceIntentHandler,
        tapparelleVoceIntentHandler,
        termostatoVoceIntentHandler,
        luciIntentHandler,
        mostraLogIntentHandler,
        termostatoIntentHandler,
        tapparelleIntentHandler,
        salvaRoutineIntentHandler,
        terminaIntentHandler,
        eliminaAzioneIntentHandler,
        rilevamentoIntentHandler,
        rilevamentoVoceIntentHandler,
        svegliaCancellataVoceIntentHandler,
        touchSvegliaIntentHandler,
        risoluzioneConflittoEsplicitoIntentHandler,
        risoluzioneConflittoPossibileIntentHandler,
        salvaComunqueIntentHandler,
        rinunciaIntentHandler,
        riprogrammaIntentHandler,
        ignoraIntentHandler,
        risolviIntentHandler,
        quesitoIntenzioniUtenteIntentHandler,
        smistaModificheIntentHandler,
        televisioneIntentHandler,
        televisioneVoceIntentHandler,
        saluteIntentHandler,
        intrattenimentoIntentHandler,
        risparmioEnergeticoIntentHandler,
        sicurezzaIntentHandler,
        lavoroIntentHandler,
        riposoIntentHandler,
        bambinoVoceIntentHandler,
        caneVoceIntentHandler,
        tosseVoceIntentHandler,
        caneVoceIntentHandler,
        impostaGiorniAlbaIntentHandler,
        russareVoceIntentHandler,
        elettrodomesticoVoceIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .addRequestInterceptors(
        interceptors.LoadAttributesRequestInterceptor,
        interceptors.LocalisationRequestInterceptor,
        interceptors.LoggingRequestInterceptor,
        interceptors.LoadNameRequestInterceptor,
    )
    .addResponseInterceptors(
        interceptors.LoggingResponseInterceptor,
        interceptors.SaveAttributesResponseInterceptor)
    .withPersistenceAdapter(
        new ddbAdapter.DynamoDbPersistenceAdapter({
            tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
            createTable: false,
            dynamoDBClient: new AWS.DynamoDB({ apiVersion: 'latest', region: process.env.DYNAMODB_PERSISTENCE_REGION })
        }))
    .withApiClient(new Alexa.DefaultApiClient())
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();