# Getting Started

Welcome to your new CAP project.

It contains these folders and files, following our recommended project layout:

File or Folder | Purpose
---------|----------
`app/` | content for UI frontends goes here
`db/` | your domain models and data go here
`srv/` | your service models and code go here
`readme.md` | this getting started guide

## Next Steps

- Open a new terminal and run `cds watch`
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start with your domain model, in a CDS file in `db/`

## Learn More

Learn more at <https://cap.cloud.sap>.


## N8N
### Initial Setup

On your first run create a volume 
```
docker volume create n8n_data
```

You can check if you've done this before by running 
```
docker volume ls
```

### Start Locally
Run the following command to start N8N via Docker.  You'll need to replace the Time Zone with your own Time Zone
```
docker run -it --rm \
 --name n8n \
 -p 5678:5678 \
 -e GENERIC_TIMEZONE="Australia/Brisbane" \
 -e TZ="Australia/Brisbane" \
 -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true \
 -e N8N_RUNNERS_ENABLED=true \
 -v n8n_data:/home/node/.n8n \
 docker.n8n.io/n8nio/n8n
```

On first login you'll be prompted to create your admin login details.  There after are you will be prompted to login using those credentials.

## Beer Links
https://www.bjcp.org/education-training/education-resources/beer-faults/