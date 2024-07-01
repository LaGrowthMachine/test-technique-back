import Express from 'express';
import {GetUser, SendEmail} from "./controller";

const app = Express();
const port = 3000;

const handleResponse = (controller: any) => {
    return async (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
        try {
            const response = await controller(req, res.locals);
            return res.status(200).json(response);
        } catch (e) {
            return next(e);
        }
    };
};

const dependencies = {}

app.use(Express.json());
app.post('/messages/:type', handleResponse(SendEmail.bind(null, dependencies)));

app.get('/users/:userId', handleResponse(GetUser.bind(null, dependencies)));


app.listen(port, async () => {
    console.log(`Server is running on http://localhost:${port}`);
});