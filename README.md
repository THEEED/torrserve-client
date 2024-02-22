# TorrServe Client

TorrServe Client is a Node.js application designed to seamlessly integrate with TorrServe and allow users to easily download torrents using their intermediate VPS server. This may be necessary to bypass operator blockers that limit torrent download speeds, for example.

TorrServe offers a user-friendly interface for adding new torrents, and TorrServe Client duplicates the torrent list display with additional functionality for downloading.

## Getting Started

### Step 1: Clone TorrServe Client Repository

Begin by cloning the TorrServe Client repository to your local machine or server where you plan to run the client.

```sh
git clone https://github.com/THEEED/torrserve-client
cd torrserve-client
```

### Step 2: Set Up TorrServe on Your VPS

Before using the TorrServe Client, you need to have TorrServe running on your VPS. Follow the installation instructions provided in the TorrServe repository:

[TorrServe by YouROK](https://github.com/YouROK/TorrServer)

### Step 3: Configure TorrServe Client

After setting up TorrServe on your VPS, configure the TorrServe Client by setting the necessary environment variables. This includes specifying the TorrServe host URL in your `.env` file:

```env
API_BASE_URL=http://your-vps-ip:port # The host URL for TorrServe
```

### Step 4: Start TorrServe Client

With the configuration in place, you can start the TorrServe Client using the following command:

```sh
npm run start
```

## Features & Roadmap

- **Download individual files**: Planned feature for downloading specific files within a torrent.
- **Add new torrents via the Client interface**: Future updates will allow users to add torrents directly through the TorrServe Client.
- **Architecture overhaul**: A rewrite is planned to improve the application's reliability and efficiency.

## Contributing

Contributions are welcome! If you have ideas for new features or improvements, feel free to fork the repository, make your changes, and submit a pull request.

## License & Support

Please refer to the original repository for license details and support options. Contributions and feedback are always welcome to enhance the project.