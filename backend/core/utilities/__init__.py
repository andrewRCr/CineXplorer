"""
Core / common helper functions.
"""


def coalesce(*arg):
    """ Returns the first argument that is not None. """
    return next((a for a in arg if a is not None), None)
