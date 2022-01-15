// * Here will be the passport configuration and strategies
const passport = require('passport');
const passportLocal = require('passport-local');
const bcrypt = require('bcrypt');

const Users = require('../models/users');

passport.serializeUser(Users.serializeUser());
passport.deserializeUser(Users.deserializeUser());

passport.use(
	new passportLocal.Strategy(
		{
			usernameField: 'email',
			passwordField: 'password',
			passReqToCallback: true,
			session: true,
		},
		(req, email, password, done) => {
			if (!req.body.email || !req.body.password) return done(null, false, { message: 'err-missing-credentials' });
			if (req.user) return done(null, false, { message: 'err-logged-in' });

			Users.findOne({ 'email.value': email }, (err, user) => {
				if (err) return done(err);

				if (!user) return done(null, false, { message: 'err-wrong-credentials' });
				if (!bcrypt.compareSync(password, user.password)) return done(null, false, { message: 'err-wrong-credentials' });

				// TODO: Check the login zone, block if not on list of allowed zones

				Users.updateOne({ _id: user._id }, { lastLogin: Date.now() }, (err, raw) => {
					if (err) return done(err);
				});

				return done(null, user);
			});
		}
	)
);
