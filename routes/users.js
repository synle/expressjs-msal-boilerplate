const express = require("express");
const msal = require("@azure/msal-node");

const router = express.Router();

// configs for SSO
const BASE_API_HOST = `http://localhost:${process.env.PORT}`;
const LOGIN_URL = "/api/auth/login";
const LOGIN_CALLBACK_URL = "/api/auth/login_callback";

const CLIENT_ID = process.env["AAD_CLIENT_ID"];
const CLIENT_SECRET = process.env["AAD_CLIENT_SECRET"];
const AUTHORITY = `https://login.microsoftonline.com/${process.env["AAD_TENANT_ID"]}`;
const REDIRECT_PATH = `${BASE_API_HOST}${LOGIN_CALLBACK_URL}`;
const SCOPE = ["user.read"];

// msal init
const confidentialClientApplication = new msal.ConfidentialClientApplication({
  auth: {
    clientId: CLIENT_ID,
    authority: AUTHORITY,
    clientSecret: CLIENT_SECRET,
  },
});

// login routes
router.get(LOGIN_URL, async (req, res, next) => {
  try {
    const response = await confidentialClientApplication.getAuthCodeUrl({
      scopes: SCOPE,
      redirectUri: REDIRECT_PATH,
    });
    res.redirect(response);
  } catch (error) {
    res.send(JSON.stringify(error));
  }
});

router.get(LOGIN_CALLBACK_URL, async (req, res, next) => {
  try {
    const tokenRequest = req.query;
    const response = await confidentialClientApplication.acquireTokenByCode({
      scopes: SCOPE,
      redirectUri: REDIRECT_PATH,
      ...tokenRequest,
    });

    const { account, requestId } = response;
    const { username, localAccountId, name, tenantId } = account;

    // store it
    req.session.user = {
      requestId,
      username,
      localAccountId,
      name,
      tenantId,
    };

    res.redirect(`${BASE_API_HOST}/api/auth/user`);
  } catch (error) {
    res.send(JSON.stringify(error));
    // TODO: redirect to login page
  }
});

router.get(`/api/auth/user`, async (req, res, next) => {
  const { user } = req.session;

  if (user) {
    return res.json(user);
  }

  res.send(401, "Unauthorized");
});

module.exports = router;
