import speakeasy from 'speakeasy';
import express from 'express';
import rateLimit from 'express-rate-limit';
import ms from 'ms';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import mkdirp from 'mkdirp';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { checkTFA } from '../utils/accounts';
import { markForDeletion } from '../utils/files';
import { logError } from '../utils/logs';

import Users from '../models/user';

const router = express.Router();

// TFA
router.post(
	'/activate-tfa',
	rateLimit({
		windowMs: ms('1h'),
		max: 3,
		statusCode: 200,
		message: 'rate-limit',
	}),
	async (req: express.Request, res: express.Response) => {
		if (!req.isAuthenticated() || !req.user) return res.status(400).send('unauthorized');

		try {
			if (req.user.tfa.secret !== '') return res.status(400).send('already-activated');

			const secret: any = speakeasy.generateSecret({
				length: 20,
			});
			req.user.tfa.secret = secret.base32;

			// Update to the database
			await Users.updateOne(
				{
					userID: req.user.userID,
				},
				{
					tfa: req.user.tfa,
				}
			);

			return res.status(200).send({
				code: secret.base32,
			});
		} catch (err: any) {
			logError(err);
			return res.status(500).send('server-error');
		}
	}
);

router.post(
	'/deactivate-tfa',
	rateLimit({
		windowMs: ms('1h'),
		max: 3,
		statusCode: 200,
		message: 'rate-limit',
	}),
	async (req: express.Request, res: express.Response) => {
		if (!req.isAuthenticated()) return res.status(403).send("unauthorized")

		const bodyScheme = z.object({
			tfaCode: z.string()
		}).required()

		const parsedBody = bodyScheme.safeParse(req.body)
		if (!parsedBody.success) return res.status(400).send('invalid-parameters');

		try {
			if (req.user.tfa.secret == '') return res.status(400).send('not-activated');

			const result = checkTFA(req.body.tfaCode, req.user);
			if (result == false) return res.status(200).send('invalid-tfa-code');

			req.user.tfa.secret = '';
			req.user.tfa.backupCodes = [];

			await Users.updateOne(
				{
					userID: req.user.userID,
				},
				{
					tfa: req.user.tfa,
				}
			);
			res.status(200).send('success');
		} catch (err: any) {
			logError(err);
			return res.status(500).send('server-error');
		}
	}
);

router.post(
	'/get-backup-tfa-codes',
	rateLimit({
		windowMs: ms('1h'),
		max: 3,
		statusCode: 200,
		message: 'rate-limit',
	}),
	async (req: express.Request, res: express.Response) => {
		if (!req.isAuthenticated() || !req.user) return res.status(403).send('unauthorized');

		const bodyScheme = z.object({
			tfaCode: z.string()
		}).required()

		const parsedBody = bodyScheme.safeParse(req.body)
		if (!parsedBody.success) return res.status(400).send('invalid-parameters');

		try {
			// Must be a code generated by the authentication app
			const verified = speakeasy.totp.verify({
				secret: req.user.tfa.secret,
				encoding: 'base32',
				token: req.body.tfaCode,
			});

			if (!verified) return res.status(200).send('invalid-tfa-code');

			// Generate Codes
			const codeList: Array<string> = [];
			for (let i = 0; i < 10; i++) {
				codeList.push(Math.random().toString(16).slice(2, 10).toLowerCase());
			}

			// Hash the generated codes (These will be stored in the database)
			const hashedCodes: Array<string> = [];
			codeList.forEach((code: string) => {
				hashedCodes.push(bcrypt.hashSync(code, 10));
			});

			// Update to the database
			req.user.tfa.backupCodes = hashedCodes;
			await Users.updateOne(
				{
					userID: req.user.userID,
				},
				{
					tfa: req.user.tfa,
				}
			);

			return res.status(200).json(codeList);
		} catch (err: any) {
			logError(err);
			return res.status(500).send('server-error');
		}
	}
);

router.post(
	'/upload-avatar',
	rateLimit({
		windowMs: ms('1h'),
		max: 3,
		statusCode: 200,
		message: 'rate-limit',
	}),
	(req, res) => {
		if (!req.isAuthenticated()) return res.status(403).send('unauthenticated');

		// Create the folder if it's not there
		mkdirp(path.join(__dirname, `../../data/avatars/${req.user.userID}`)).then(() => {
			// Mark the old file for deletion
			markForDeletion(path.join(__dirname, `../../data/avatars/${req.user.userID}/${req.user.avatar}.png`));

			// Set the storage engine
			const avatarUpload = multer({
				storage: multer.diskStorage({
					destination: (req: express.Request, file: any, cb: any) => {
						cb(null, path.join(__dirname, `../../data/avatars/${req.user?.userID}`));
					},
					filename: async (req: express.Request, file: any, cb: any) => {
						// Update the user's avatar in the database
						const avatarID = uuidv4().split('-').join('');
						await Users.updateOne(
							{
								userID: req.user?.userID,
							},
							{
								avatar: avatarID,
							}
						);

						cb(null, `${avatarID}.png`);
					},
				}),
			});

			// Save the avatar
			avatarUpload.single('avatar')(req, {} as any, (err: any) => {
				if (err) throw err;
			});

			return res.send('ok');
		});
	}
);

module.exports = router;
