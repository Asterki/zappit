module.exports = (app) => {
    // * /api/private/pages/
    app.use('/api/private/pages/', require('./private/pages'));
    app.use('/api/private/accounts/', require('./private/accounts'));

};
