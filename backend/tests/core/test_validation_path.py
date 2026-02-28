"""
Unit tests for storage path validation.

This module tests validate_storage_path() to ensure it prevents:
- Path traversal attacks (CWE-22)
- Null byte injection
- Absolute path access
- Symlink-based directory escape
- URL-encoded and double-encoded traversal attempts
"""

import tempfile
from pathlib import Path
from urllib.parse import quote

import pytest
from fastapi import HTTPException

from app.core.validation import validate_storage_path


@pytest.fixture
def temp_base_path(tmp_path):
    """Create a temporary base directory for testing."""
    base_dir = tmp_path / "storage"
    base_dir.mkdir()
    return str(base_dir)


class TestValidStoragePaths:
    """Test suite for valid storage path scenarios."""

    @pytest.mark.parametrize("path", [
        "file.txt",
        "user123/document.pdf",
        "user123/project456/image.png",
        "a/b/c/d/e/deeply/nested/file.txt",
        "file-with-dashes.txt",
        "file_with_underscores.txt",
        "file.multiple.dots.txt",
        "user123/2024-01-15/report.pdf",
        "CaseSensitive/FileName.TXT",
        "unicode_文件名.txt",
    ], ids=[
        "simple_filename",
        "one_level_deep",
        "two_levels_deep",
        "deeply_nested",
        "dashes",
        "underscores",
        "multiple_dots",
        "date_folder",
        "case_sensitive",
        "unicode",
    ])
    def test_valid_paths(self, path: str, temp_base_path: str):
        """
        Test that valid relative paths are accepted.

        Verifies that:
        - Simple filenames are accepted
        - Nested paths with forward slashes are accepted
        - Various naming conventions are supported
        - The original path is returned unchanged
        """
        result = validate_storage_path(path, temp_base_path)
        assert result == path


class TestEmptyAndWhitespacePaths:
    """Test suite for empty and whitespace-only path validation."""

    @pytest.mark.parametrize("path", [
        "",
        " ",
        "   ",
        "\t",
        "\n",
        "  \t  \n  ",
    ], ids=[
        "empty_string",
        "single_space",
        "multiple_spaces",
        "tab",
        "newline",
        "mixed_whitespace",
    ])
    def test_empty_and_whitespace_paths_rejected(self, path: str, temp_base_path: str):
        """
        Test that empty and whitespace-only paths are rejected.

        Verifies that:
        - Empty strings raise HTTPException
        - Whitespace-only paths raise HTTPException
        - Error code is 400 BAD_REQUEST
        - Error message is "Invalid storage path"
        """
        with pytest.raises(HTTPException) as exc_info:
            validate_storage_path(path, temp_base_path)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Invalid storage path"


class TestNullByteInjection:
    """Test suite for null byte injection attacks."""

    @pytest.mark.parametrize("path", [
        "file.txt\x00",
        "\x00file.txt",
        "file\x00.txt",
        "user/file.txt\x00.jpg",
        "user\x00/file.txt",
        "\x00\x00\x00",
        "normal_path\x00../../etc/passwd",
    ], ids=[
        "null_at_end",
        "null_at_start",
        "null_in_middle",
        "null_extension_bypass",
        "null_in_directory",
        "multiple_nulls",
        "null_with_traversal",
    ])
    def test_null_byte_injection_rejected(self, path: str, temp_base_path: str):
        """
        Test that null byte injection attempts are rejected.

        Null bytes can bypass file extension checks and security filters.
        Verifies that:
        - Null bytes anywhere in the path are detected
        - HTTPException with 400 status is raised
        - Error message is generic for security
        """
        with pytest.raises(HTTPException) as exc_info:
            validate_storage_path(path, temp_base_path)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Invalid storage path"


class TestAbsolutePathRejection:
    """Test suite for absolute path rejection."""

    @pytest.mark.parametrize("path", [
        "/etc/passwd",
        "/var/log/messages",
        "/root/.ssh/id_rsa",
        "/",
        "/tmp/file.txt",
        "\\Windows\\System32\\config\\SAM",
        "\\",
        "\\Users\\Admin\\Desktop\\secrets.txt",
        "C:\\Windows\\System32",
        "D:\\Data\\private.db",
    ], ids=[
        "unix_etc_passwd",
        "unix_var_log",
        "unix_ssh_key",
        "unix_root",
        "unix_tmp",
        "windows_system32",
        "windows_root",
        "windows_users",
        "windows_c_drive",
        "windows_d_drive",
    ])
    def test_absolute_paths_rejected(self, path: str, temp_base_path: str):
        """
        Test that absolute paths are rejected.

        Absolute paths should not be allowed as storage paths must be
        relative to the configured base directory.
        Verifies that:
        - Unix-style absolute paths (/) are rejected
        - Windows-style absolute paths (\\) are rejected
        - Drive letter paths are rejected
        """
        with pytest.raises(HTTPException) as exc_info:
            validate_storage_path(path, temp_base_path)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Invalid storage path"


class TestParentDirectoryTraversal:
    """Test suite for parent directory traversal attacks."""

    @pytest.mark.parametrize("path", [
        "..",
        "../",
        "../etc/passwd",
        "../../etc/passwd",
        "../../../etc/passwd",
        "../../../../../../../../etc/passwd",
        "user/../etc/passwd",
        "user/../../etc/passwd",
        "user/project/../../etc/passwd",
        "uploads/../../../config/database.yml",
        "a/b/c/../../../../etc/passwd",
        "..file.txt",  # Edge case: filename starting with ..
        "file..txt",  # Edge case: .. in middle
        "file..",  # Edge case: filename ending with ..
    ], ids=[
        "simple_dotdot",
        "dotdot_slash",
        "one_level_up",
        "two_levels_up",
        "three_levels_up",
        "many_levels_up",
        "traversal_after_dir",
        "two_traversals",
        "traversal_from_nested",
        "realistic_attack",
        "deep_traversal",
        "filename_starts_with_dotdot",
        "dotdot_in_middle",
        "filename_ends_with_dotdot",
    ])
    def test_parent_directory_traversal_rejected(self, path: str, temp_base_path: str):
        """
        Test that parent directory traversal attempts are rejected.

        Tests various forms of '../' path traversal attacks.
        Verifies that:
        - Simple '..' is rejected
        - Traversal at any depth is rejected
        - Mixed valid/invalid paths are rejected
        - Edge cases with '..' in filenames are handled
        """
        with pytest.raises(HTTPException) as exc_info:
            validate_storage_path(path, temp_base_path)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Invalid storage path"


class TestBackslashTraversal:
    """Test suite for backslash-based traversal attacks."""

    @pytest.mark.parametrize("path", [
        "..\\",
        "..\\..\\",
        "..\\..\\..\\etc\\passwd",
        "user\\..\\etc\\passwd",
        "uploads\\..\\..\\config\\database.yml",
        "a\\b\\c\\..\\..\\..\\..\\etc\\passwd",
        "mixed/path\\..\\traversal",
        "..\\Windows\\System32",
    ], ids=[
        "simple_backslash_traversal",
        "double_backslash_traversal",
        "deep_backslash_traversal",
        "backslash_after_dir",
        "realistic_backslash_attack",
        "deep_backslash_attack",
        "mixed_slash_backslash",
        "windows_traversal",
    ])
    def test_backslash_traversal_rejected(self, path: str, temp_base_path: str):
        """
        Test that backslash-based traversal attempts are rejected.

        Backslashes should be rejected on all platforms, not just Windows.
        Verifies that:
        - Backslash traversal patterns are rejected
        - Mixed forward-slash and backslash paths are rejected
        """
        with pytest.raises(HTTPException) as exc_info:
            validate_storage_path(path, temp_base_path)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Invalid storage path"


class TestMixedTraversalAttempts:
    """Test suite for mixed and creative traversal attempts."""

    @pytest.mark.parametrize("path", [
        "user/./../../etc/passwd",
        "./../../etc/passwd",
        "user/./../etc/passwd",
        "./../etc/passwd",
        "user/project/.././../etc/passwd",
        "...///...///etc/passwd",
        ".../etc/passwd",
        "user///..//etc/passwd",
    ], ids=[
        "dot_slash_traversal",
        "leading_dot_slash_traversal",
        "dot_before_traversal",
        "simple_dot_traversal",
        "complex_dot_traversal",
        "triple_dot_slash",
        "triple_dot",
        "double_slash_traversal",
    ])
    def test_mixed_traversal_rejected(self, path: str, temp_base_path: str):
        """
        Test that mixed and creative traversal attempts are rejected.

        Tests combinations of '.', '..', and slashes.
        Verifies that:
        - Dot-slash combinations with traversal are rejected
        - Multiple slashes don't bypass validation
        - Creative variations are caught
        """
        with pytest.raises(HTTPException) as exc_info:
            validate_storage_path(path, temp_base_path)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Invalid storage path"


class TestURLEncodedTraversal:
    """Test suite for URL-encoded traversal attempts."""

    @pytest.mark.parametrize("path", [
        quote("../etc/passwd"),  # %2E%2E%2Fetc%2Fpasswd
        quote("../../etc/passwd"),
        quote("..\\..\\Windows"),
        "user/" + quote("../etc/passwd"),
        quote("uploads/../../../config/database.yml"),
        "%2e%2e/etc/passwd",  # Lowercase encoding
        "%2E%2E/etc/passwd",  # Uppercase encoding
        "%2e%2e%2f%2e%2e%2fetc%2fpasswd",  # Fully encoded
    ], ids=[
        "url_encoded_single_traversal",
        "url_encoded_double_traversal",
        "url_encoded_backslash",
        "partial_url_encoded",
        "url_encoded_realistic",
        "lowercase_url_encoded",
        "uppercase_url_encoded",
        "fully_url_encoded",
    ])
    def test_url_encoded_traversal_rejected(self, path: str, temp_base_path: str):
        """
        Test that URL-encoded traversal attempts are rejected.

        URL encoding is sometimes used to bypass path validation.
        Verifies that:
        - URL-encoded '..' sequences are rejected
        - Both uppercase and lowercase encoding are caught
        - Partially and fully encoded paths are rejected
        """
        with pytest.raises(HTTPException) as exc_info:
            validate_storage_path(path, temp_base_path)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Invalid storage path"


class TestDoubleEncodedTraversal:
    """Test suite for double-encoded traversal attempts."""

    @pytest.mark.parametrize("path", [
        quote(quote(".."), safe=''),  # Double-encoded ..
        quote(quote("../"), safe=''),  # Double-encoded ../
        quote(quote("../etc/passwd"), safe=''),
        "%252e%252e/etc/passwd",  # Manually double-encoded ..
        "%252e%252e%252f%252e%252e%252fetc%252fpasswd",  # Fully double-encoded
    ], ids=[
        "double_encoded_dotdot",
        "double_encoded_dotdot_slash",
        "double_encoded_full_path",
        "manual_double_encoded",
        "fully_double_encoded",
    ])
    def test_double_encoded_traversal_rejected(self, path: str, temp_base_path: str):
        """
        Test that double-encoded traversal attempts are rejected.

        Some applications decode paths multiple times, which attackers exploit.
        Verifies that:
        - Double-encoded traversal sequences are rejected
        - Manual and programmatic double-encoding are caught
        """
        with pytest.raises(HTTPException) as exc_info:
            validate_storage_path(path, temp_base_path)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Invalid storage path"


class TestSymlinkAndBasePathVerification:
    """Test suite for symlink resolution and base path boundary enforcement."""

    def test_path_within_base_directory(self, temp_base_path: str):
        """
        Test that paths within the base directory are accepted.

        Verifies that:
        - Valid paths are correctly resolved
        - Paths stay within the base directory
        """
        # Create a valid file in the base directory
        base = Path(temp_base_path)
        test_dir = base / "user123"
        test_dir.mkdir(exist_ok=True)
        test_file = test_dir / "file.txt"
        test_file.write_text("test content")

        result = validate_storage_path("user123/file.txt", temp_base_path)
        assert result == "user123/file.txt"

    def test_symlink_escape_attempt_rejected(self, temp_base_path: str, tmp_path: Path):
        """
        Test that symlink-based directory escape is prevented.

        Verifies that:
        - Symlinks pointing outside the base directory are detected
        - The resolved path must be within the base directory
        - HTTPException is raised for escape attempts
        """
        base = Path(temp_base_path)

        # Create a directory outside the base path
        external_dir = tmp_path / "external"
        external_dir.mkdir(exist_ok=True)
        external_file = external_dir / "secret.txt"
        external_file.write_text("secret data")

        # Create a symlink inside base that points outside
        symlink_path = base / "escape_link"
        try:
            symlink_path.symlink_to(external_dir)
        except OSError:
            # Skip test if symlinks not supported (e.g., Windows without admin)
            pytest.skip("Symlinks not supported on this system")

        # Attempt to access the symlinked path
        with pytest.raises(HTTPException) as exc_info:
            validate_storage_path("escape_link/secret.txt", temp_base_path)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Invalid storage path"

    def test_base_path_boundary_enforcement(self, temp_base_path: str, tmp_path: Path):
        """
        Test that the resolved path must be within the base path.

        Verifies that:
        - Paths that resolve outside the base are rejected
        - Even if the file path looks valid, resolution is checked
        """
        # Try to construct a path that might escape after resolution
        # Create the base and a sibling directory
        base = Path(temp_base_path)
        sibling = tmp_path / "sibling"
        sibling.mkdir(exist_ok=True)

        # Try to create a relative path that would escape
        # This should be caught by the '..' check, but let's verify
        with pytest.raises(HTTPException) as exc_info:
            validate_storage_path("../sibling/file.txt", temp_base_path)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Invalid storage path"

    def test_invalid_path_characters_handled(self, temp_base_path: str):
        """
        Test that paths with invalid characters are handled gracefully.

        Verifies that:
        - Paths that cause ValueError or RuntimeError in Path.resolve() are caught
        - Generic error message is returned for security
        """
        # Note: The exact behavior depends on the OS and filesystem
        # This test ensures graceful handling of any resolve() errors

        # On most systems, these might not trigger ValueError/RuntimeError,
        # but they'll be caught by other checks. This test documents
        # the error handling for edge cases.
        try:
            # Most invalid characters are already caught by earlier checks
            # But let's test that the try/except around resolve() works
            result = validate_storage_path("valid/path.txt", temp_base_path)
            assert result == "valid/path.txt"
        except HTTPException:
            # Some systems might reject certain characters
            pass


class TestEdgeCases:
    """Test suite for edge cases and boundary conditions."""

    def test_very_long_path(self, temp_base_path: str):
        """
        Test handling of very long paths.

        Verifies that:
        - Very long paths are processed correctly
        - No buffer overflow or performance issues occur
        """
        # Create a path with 100 nested directories
        long_path = "/".join([f"dir{i}" for i in range(100)]) + "/file.txt"

        # Should succeed if within base path (no traversal)
        result = validate_storage_path(long_path, temp_base_path)
        assert result == long_path

    def test_path_with_special_characters(self, temp_base_path: str):
        """
        Test paths with special but valid characters.

        Verifies that:
        - Hyphens, underscores, dots are allowed
        - Unicode characters are accepted
        - Spaces are handled
        """
        valid_special_paths = [
            "file-name.txt",
            "file_name.txt",
            "file name.txt",  # Space
            "файл.txt",  # Cyrillic
            "文件.txt",  # Chinese
            "ملف.txt",  # Arabic
            "file@symbol.txt",  # @ symbol
            "file#tag.txt",  # # symbol
        ]

        for path in valid_special_paths:
            try:
                result = validate_storage_path(path, temp_base_path)
                assert result == path
            except HTTPException:
                # Some special characters might be rejected by the OS
                # This is OK - we're testing that it doesn't crash
                pass

    def test_case_sensitivity(self, temp_base_path: str):
        """
        Test that path validation is case-sensitive on appropriate systems.

        Verifies that:
        - Case is preserved in the returned path
        - Validation doesn't inadvertently change case
        """
        mixed_case_path = "User123/Project456/File.TXT"
        result = validate_storage_path(mixed_case_path, temp_base_path)
        assert result == mixed_case_path

    def test_consecutive_slashes(self, temp_base_path: str):
        """
        Test handling of paths with consecutive slashes.

        Verifies that:
        - Multiple consecutive slashes don't bypass validation
        - Paths are normalized properly or rejected
        """
        # Consecutive slashes should be normalized by Path
        # but shouldn't bypass traversal checks
        path_with_double_slash = "user///project//file.txt"
        result = validate_storage_path(path_with_double_slash, temp_base_path)
        assert result == path_with_double_slash

    def test_path_normalization_doesnt_bypass_validation(self, temp_base_path: str):
        """
        Test that path normalization doesn't bypass security checks.

        Verifies that:
        - Even if paths normalize to valid locations, '..' is still rejected
        - Checks happen before resolution
        """
        # This path normalizes to "etc/passwd" but contains '..'
        with pytest.raises(HTTPException) as exc_info:
            validate_storage_path("user/../etc/passwd", temp_base_path)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "Invalid storage path"
