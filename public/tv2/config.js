// MyTrivia TV — deployment config. The owner fills these in (see README.md).
// A CloudKit JS API token is public by design (it ships in every page); lock it
// in CloudKit Console to the allowed origin https://mytrivia.io.
window.MTTV_CONFIG = {
  containerIdentifier: 'iCloud.io.mytrivia.app',
  apiToken: '2ca586926d7227baf4b2105e1ffbbff36b6d5c7d730332b871f8e2a0fb488eca',              // ← CloudKit Console → Tokens & Keys → API Token (sign-in callback: none)
  environment: 'production',    // 'development' while testing against the Development schema
};
