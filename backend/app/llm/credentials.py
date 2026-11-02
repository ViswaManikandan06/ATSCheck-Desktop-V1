import keyring


class CredentialStore:
    """
    Secure credential storage backed by the operating system.

    macOS:
        Keychain

    Windows:
        Credential Manager

    Linux:
        Secret Service / supported keyring backend
    """

    SERVICE_NAME = "atscheck-desktop"

    def _validate_provider_id(
        self,
        provider_id: str,
    ) -> None:
        if not provider_id or not provider_id.strip():
            raise ValueError(
                "Provider ID cannot be empty."
            )

    def set_secret(
        self,
        provider_id: str,
        secret: str,
    ) -> None:
        """
        Store a provider credential securely.
        """

        self._validate_provider_id(provider_id)

        if not secret or not secret.strip():
            raise ValueError(
                "Credential cannot be empty."
            )

        keyring.set_password(
            self.SERVICE_NAME,
            provider_id,
            secret,
        )

    def get_secret(
        self,
        provider_id: str,
    ) -> str | None:
        """
        Retrieve a provider credential.
        """

        self._validate_provider_id(provider_id)

        return keyring.get_password(
            self.SERVICE_NAME,
            provider_id,
        )

    def delete_secret(
        self,
        provider_id: str,
    ) -> None:
        """
        Remove a provider credential.
        """

        self._validate_provider_id(provider_id)

        try:
            keyring.delete_password(
                self.SERVICE_NAME,
                provider_id,
            )
        except keyring.errors.PasswordDeleteError:
            pass

    def has_secret(
        self,
        provider_id: str,
    ) -> bool:
        """
        Check whether a credential exists.
        """

        return self.get_secret(provider_id) is not None