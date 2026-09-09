import logging
import os

_configured = False


def get_logger(name):
    global _configured
    if not _configured:
        logging.basicConfig(
            level=os.getenv("LOG_LEVEL", "INFO"),
            format="%(asctime)s %(levelname)s %(name)s %(message)s",
        )
        _configured = True
    return logging.getLogger(name)
