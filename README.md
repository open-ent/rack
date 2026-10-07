# À propos de l'application rack

- Licence : [AGPL v3](http://www.gnu.org/licenses/agpl.txt) - Copyright Edifice
- Financeur(s) : Edifice
- Développeur(s) : Edifice
- Description : this application allows users to send documents to one another, in a different way then using the workspace app.

## Setup

Add to your ent-core springboard configuration file the following lines :<br>
_(you **might** want to change certain fields like port n° & mode)_

```
"name": "fr.wseduc~rack~0.1-SNAPSHOT",
"config": {
    "main" : "fr.wseduc.rack.Rack",
    "port" : 8026,
    "app-name" : "Rack",
    "app-address" : "/rack",
    "app-icon" : "rack-large",
    "app-displayName" : "Rack",
    "mode": "dev",
    "integration-mode" : "HTTP",
    "app-registry.port" : 8012,
    "entcore.port" : 8090,
    "auto-redeploy": true
}
```

**Optional :**

`gridfs-address` : grisfs persistor bus address (default : "wse.gridfs.persistor")<br>
`alertStorage` : value in percent, threshold at which the user will be notified when free space is now (default : 80)<br>
`image-resizer-address` : image resizer module bus address (default : "wse.image.resizer")<br>


Ce dépôt est un miroir officiel du dépôt Edifice : https://github.com/edificeio/rack


### Aide contextuelle

Le frontend consomme `@open-ent/context-help@0.1.0` depuis GitHub Packages via l'alias
npm `@openent/context-help`. Les imports existants restent inchangés ; aucune archive
locale `vendor/*.tgz` n'est nécessaire.

Le scope `@open-ent` est déjà configuré dans les fichiers `.npmrc` du workspace et du
frontend. En local, fournir `NODE_AUTH_TOKEN` avec accès en lecture aux packages de
l'organisation `open-ent`. La CI utilise le secret existant `OPENENT_PACKAGES_TOKEN`.
Ne pas enregistrer le jeton dans le dépôt.
