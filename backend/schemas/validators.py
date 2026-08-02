"""Shared Pydantic field validators."""


def reject_nul_bytes(v):
    """Postgres text columns reject NUL (0x00) bytes at the wire-protocol
    level, which otherwise surfaces as an unhandled 500 during INSERT.
    Strip them at the API boundary instead of letting bad input reach the DB."""
    if isinstance(v, str) and "\x00" in v:
        raise ValueError("must not contain NUL characters")
    return v
