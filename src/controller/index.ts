import {MongoClient, ObjectId} from 'mongodb';
const Datastore = require('nestdb');

type RequestParsed = {
    query?: any;
    params?: any;
    body?: any;
};


const GetUser = async (dependencies: any, {query, params}: Partial<RequestParsed>) => {

    let error = false
    if (!params.userId) {
        error = true;
    }

    if (error) {
        return 'error'
    }


    const mongoClient = new Datastore({ filename: 'db/mongo.db' });
    mongoClient.load()
    const user: any =  await new Promise( (resolve, reject) => {
         mongoClient.findOne({_id: params.userId},  function (err: any, doc: any) {
            resolve(doc)
        })
    })

    if (!user) {
        return 'not found'
    }

    return user
};


const SendEmail = async (dependencies: any, {query, params, body}: Partial<RequestParsed>) => {
    let error = false
    if (!body.userId || !body.content || !body.emailTo || !params.type) {
        error = true;
    }

    if (error) {
        return 'error'
    }

    const mongoClient = new Datastore({ filename: 'db/mongo.db' });
    mongoClient.load();
    const user: {
        _id: string
        name: string,
        email: string,
        track: boolean,
        credits: number
    } =  await new Promise( (resolve, reject) => {
        mongoClient.findOne({_id: body.userId},  function (err: any, doc: any) {
            resolve(doc)
        })
    })

    if (!user) {
        return 'not found'
    }


    let success = false

    if (params.type === 'GMAIL') {
        const gmail = new Gmail({secretToken: process.env.secretToken, appToken: process.env.appToken})
        await gmail.init();
        if (user.credits > 0) {
            await gmail.sendEmail(body.content, body.emailTo, user.email)
            await new Promise( (resolve, reject) => {
                mongoClient.update({_id: body.userId}, { $inc: { credits: -1}} , {},  function (err: any, doc: any) {
                    resolve(doc)
                })
            })
        }
        success = true
    }

    let trackData: any = {
        message: 'Email sent',
        userId: user._id.toString(),
        timestamp: new Date().getTime(),
        to: body.emailTo,
    };

    if (!success) {
        trackData.message = `Email failed`
        trackData.content = body.content
    }

    if (user.track) {
        const segment = new SegmentAnalytics()
        await segment.track(trackData)
        if(process.env.ENV === 'prod'){
            const mixpanel = new MixpanelAnalytics()
            await mixpanel.track(trackData)
        }
    }
    return 'sent'

};


class MixpanelAnalytics {
    analytics: Array<{
        message: string,
        userId: string,
        timestamp: number,
        to: string,
        content?: string
    }>

    constructor() {
        this.analytics = []
    }

    async track(data: {
        message: string,
        userId: string,
        timestamp: number,
        to: string,
        content?: string
    }) {
        this.analytics.push(data)
    }
}

class SegmentAnalytics {
    analytics: Array<{
        message: string,
        userId: string,
        timestamp: number,
        to: string,
        content?: string
    }>

    constructor() {
        this.analytics = []
    }

    async track(data: {
        message: string,
        userId: string,
        timestamp: number,
        to: string,
        content?: string
    }) {
        this.analytics.push(data)
    }
}


class Gmail {

    secretToken: string
    appToken: string
    emailsSent: Array<{
        content: string, to: string, from: string
    }>
    connected: boolean

    constructor(params: {
        secretToken: any
        appToken: any
    }) {
        this.secretToken = params.secretToken
        this.appToken = params.appToken
        this.emailsSent = []
        this.connected = false
    }

    async init() {
        this.connected = true
    }

    async sendEmail(content: string, to: string, from: string): Promise<boolean> {
        this.emailsSent.push({
            content, to, from
        })
        return true
    }
}


export {SendEmail, GetUser}