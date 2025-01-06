# PokeCardDetector

Inspired by a [magic card detector](https://github.com/hj3yoo/mtg_card_detector), this is a similar project, but for pokemon cards.

Written in python using openCV and PIL for imaged detection/loading, pandas for database storage, and the [pokemon-tcg-sdk](https://github.com/PokemonTCG/pokemon-tcg-sdk-python) for accessing information about the cards and the images of the cards.

This API does reccomend the use of an API key (for more requests per day), which can be gotten from [here](https://dev.pokemontcg.io/). In order to use the API key, set the environment variable (using your API key):

```bash
export POKEMONTCG_IO_API_KEY='12345678-1234-1234-1234-123456789ABC'
```

In order for the camera to work, the website must be served under a "secure context" (HTTPS) so key generation and installation must be done. Then the program can be run:

```bash
gunicorn --certfile CERT_FILE.pem --keyfile CERT_KEY_FILE.pem -b 0.0.0.0 'app:app'
```

The first time the program is run, the database will need to be built, and while it is multithreaded it will still take some time.
It will download all of the images (~15 GB) and calculate all of the hashes for the detection once done.

Then after the data is loaded the webserver can be accessed via either [localhost](127.0.0.1:8000) or your computer's IP on its local network with the port set in gunicorn (default is 8000)
