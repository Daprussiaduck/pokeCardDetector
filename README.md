# PokeCardDetector

Inspired by a [magic card detector](https://github.com/hj3yoo/mtg_card_detector), this is a similar project, but for pokemon cards.

Written in python using openCV and PIL for imaged detection/loading, pandas for database storage, and the [pokemon-tcg-sdk](https://github.com/PokemonTCG/pokemon-tcg-sdk-python) for accessing information about the cards not already included in the [pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data) repository.

In order for the camera to work, the website must be served under a "secure context" (HTTPS) so key generation and installation must be done. Then the program can be run:

```bash
gunicorn --workers=4 --certfile CERT_FILE.pem --keyfile CERT_KEY_FILE.pem -b 0.0.0.0 'app:app'
```

The first time the program is run, the database will need to be built, and while it is multithreaded it will still take some time.
It will download all of the images (~15 GB) and calculate all of the hashes for the detection once done. 
