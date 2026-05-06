"""Tests for the main FastAPI application."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestHealth:
    """Health check endpoint tests."""
    
    def test_health_check(self):
        """Test that health check endpoint returns OK status."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestHelloEndpoint:
    """Hello endpoint tests."""
    
    def test_hello_returns_message(self):
        """Test that hello endpoint returns expected message."""
        response = client.get("/api/hello")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "hello world"


class TestRoot:
    """Root endpoint tests."""
    
    def test_root_returns_api_info(self):
        """Test that root endpoint returns the frontend HTML."""
        response = client.get("/")
        assert response.status_code == 200
        # Should return HTML content
        content = response.text
        assert "<!DOCTYPE html>" in content
        assert "Kanban Studio" in content
        assert response.headers["content-type"].startswith("text/html")


class TestOpenAPI:
    """OpenAPI schema tests."""
    
    def test_openapi_schema_exists(self):
        """Test that OpenAPI schema endpoint is available."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert "paths" in data


class TestAuthentication:
    """Authentication endpoint tests."""
    
    def test_login_success(self):
        """Test successful login with correct credentials."""
        response = client.post(
            "/api/auth/login",
            json={"username": "user", "password": "password"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Login successful"
        assert "token" in data
        assert data["token"] == "dummy-token"
    
    def test_login_invalid_credentials(self):
        """Test login failure with invalid credentials."""
        response = client.post(
            "/api/auth/login",
            json={"username": "user", "password": "wrong"}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert data["detail"] == "Invalid credentials"
    
    def test_login_missing_fields(self):
        """Test login with missing username or password."""
        response = client.post(
            "/api/auth/login",
            json={"username": "user"}
        )
        assert response.status_code == 401
        
        response = client.post(
            "/api/auth/login",
            json={"password": "password"}
        )
        assert response.status_code == 401
    
    def test_logout(self):
        """Test logout endpoint."""
        response = client.post("/api/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Logout successful"
