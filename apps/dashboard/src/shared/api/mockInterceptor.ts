import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { isMockEnabled, MOCK_CONFIG } from "./mockConfig";
import { mockStore } from "./mockStore";

/**
 * Mock API Interceptor
 * Intercepts axios requests and returns mock data when enabled
 */

interface MockPayload {
  success: boolean;
  data?: unknown;
  message?: string;
}

interface ApiResponseEnvelope {
  data: unknown;
  requestId: string;
  error?: string;
}

interface MockResponse {
  data: ApiResponseEnvelope;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: InternalAxiosRequestConfig;
}

/**
 * Initialize mock interceptor for axios instance
 */
function init(axiosInstance: AxiosInstance) {
  // Register interceptor - this MUST run before other interceptors
  // Using index 0 to ensure it runs first
  axiosInstance.interceptors.request.use(
    async (config) => {
      // Check if mock is enabled dynamically
      if (!MOCK_CONFIG.ENABLE_MOCK_API) {
        // Mock is disabled, let request proceed normally
        return config;
      }

      // Check if this request should be mocked
      const mockResponse = await handleRequest(config);

      if (mockResponse) {
        // Cancel the real request and return mock data
        config.adapter = () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(mockResponse);
            }, MOCK_CONFIG.MOCK_DELAY);
          });
        };
      }

      return config;
    },
    (error) => {
      console.error("❌ Error in mock interceptor:", error);
      return Promise.reject(error);
    },
  );
}

/**
 * Handle the request and return mock response if applicable
 */
async function handleRequest(config: InternalAxiosRequestConfig): Promise<MockResponse | null> {
  const url = config.url || "";
  const method = config.method?.toUpperCase();

  // Test endpoint for 401 responses
  if (url.includes("/test-401")) {
    return createResponse({ success: false, message: "Unauthorized" }, 401, config);
  }

  // Check for /user endpoint BEFORE /users (to avoid matching /user as /users)
  if (url.includes("/user") && !url.includes("/users") && isMockEnabled("users")) {
    return handleUsersEndpoint(url, method, config);
  }

  // Users endpoints (plural)
  if (url.includes("/users") && isMockEnabled("users")) {
    return handleUsersEndpoint(url, method, config);
  }

  // Branches endpoints
  if (url.includes("/branches") && isMockEnabled("branches")) {
    return handleBranchesEndpoint(url, method, config);
  }

  // Outside Brokers endpoints
  if (url.includes("/outside-brokers") && isMockEnabled("outside_brokers")) {
    return handleOutsideBrokersEndpoint(url, method, config);
  }

  // Outside Carriers endpoints
  if (url.includes("/outside-carriers") && isMockEnabled("outside_carriers")) {
    return handleOutsideCarriersEndpoint(url, method, config);
  }

  return null; // Let the real API handle it
}

/**
 * Handle users endpoints
 */
function handleUsersEndpoint(
  url: string,
  method = "GET",
  config: InternalAxiosRequestConfig,
): MockResponse {
  // GET /users - Get users with pagination, sorting, and search
  if (method === "GET" && url.match(/^\/api\/users\/?$/)) {
    // Extract query parameters
    const params = config.params || {};
    const page = params.page !== undefined ? Number(params.page) : 0;
    const limit = params.limit !== undefined ? Number(params.limit) : 10;
    const sortField = params.sortField || "createdAt";
    const sortOrder = params.sortOrder || "descend";
    const query = params.query || "";

    const paginatedData = mockStore.getUsers({
      page,
      limit,
      sortField,
      sortOrder,
      query,
    });

    // Transform users to include branch object format
    const transformedUsers = paginatedData.users.map((user) => ({
      ...user,
      branch: {
        id: user.branchId,
        name: user.branchName || "Unknown Branch",
      },
    }));

    const responseData = {
      ...paginatedData,
      users: transformedUsers,
    };

    return createResponse(
      {
        success: true,
        data: responseData,
      },
      200,
      config,
    );
  }

  // Try pattern without leading /api
  if (method === "GET" && url.match(/^\/users\/?$/)) {
    // Extract query parameters
    const params = config.params || {};
    const page = params.page !== undefined ? Number(params.page) : 0;
    const limit = params.limit !== undefined ? Number(params.limit) : 10;
    const sortField = params.sortField || "createdAt";
    const sortOrder = params.sortOrder || "descend";
    const query = params.query || "";

    const paginatedData = mockStore.getUsers({
      page,
      limit,
      sortField,
      sortOrder,
      query,
    });

    // Transform users to include branch object format
    const transformedUsers = paginatedData.users.map((user) => ({
      ...user,
      branch: {
        id: user.branchId,
        name: user.branchName || "Unknown Branch",
      },
    }));

    const responseData = {
      ...paginatedData,
      users: transformedUsers,
    };

    return createResponse(
      {
        success: true,
        data: responseData,
      },
      200,
      config,
    );
  }

  // GET /user - Get current user profile
  if (method === "GET" && (url.match(/^\/api\/user\/?$/) || url.match(/^\/user\/?$/))) {
    const currentUser = mockStore.getUserById("5"); // Simulate logged-in user as ID '5' (Head Owner)

    if (currentUser) {
      // Transform to CurrentUser format with branch object
      const transformedUser = {
        email: currentUser.email,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        role: currentUser.role,
        isActive: currentUser.isActive,
        branch: {
          id: currentUser.branchId,
          name: currentUser.branchName || "Unknown Branch",
        },
        registeredDate: currentUser.registeredDate,
      };
      return createResponse(
        {
          success: true,
          data: transformedUser,
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "User not found",
        },
        404,
        config,
      );
    }
  }

  // GET /users/{userId} - Get user by ID
  if (method === "GET" && url.match(/^\/api\/users\/[^/]+\/?$/)) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const user = mockStore.getUserById(id);

    if (user) {
      // Transform to include branch object format
      const transformedUser = {
        ...user,
        branch: {
          id: user.branchId,
          name: user.branchName || "Unknown Branch",
        },
      };

      return createResponse(
        {
          success: true,
          data: transformedUser,
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "User not found",
        },
        404,
        config,
      );
    }
  }

  // POST /users - Create user
  if (method === "POST" && url.match(/^\/api\/users\/?$/)) {
    const userData = config.data;
    const newUser = mockStore.createUser(userData);

    return createResponse(
      {
        success: true,
        data: newUser,
        message: "User created successfully",
      },
      201,
      config,
    );
  }

  // Alternative POST pattern without /api
  if (method === "POST" && url.match(/^\/users\/?$/)) {
    const userData = config.data;
    const newUser = mockStore.createUser(userData);

    return createResponse(
      {
        success: true,
        data: newUser,
        message: "User created successfully",
      },
      201,
      config,
    );
  }

  // PUT /users/{userId} - Update user
  if (method === "PUT" && url.match(/^\/api\/users\/[^/]+\/?$/)) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const updateData = config.data;

    const updatedUser = mockStore.updateUser(id, updateData);

    if (updatedUser) {
      return createResponse(
        {
          success: true,
          data: updatedUser,
          message: "User updated successfully",
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "User not found",
        },
        404,
        config,
      );
    }
  }

  // Alternative PUT pattern without /api
  if (method === "PUT" && url.match(/^\/users\/\d+\/?$/)) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const updateData = config.data;

    const updatedUser = mockStore.updateUser(id, updateData);

    if (updatedUser) {
      return createResponse(
        {
          success: true,
          data: updatedUser,
          message: "User updated successfully",
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "User not found",
        },
        404,
        config,
      );
    }
  }

  // PATCH /user - Self update (name only)
  if (method === "PATCH" && (url.match(/^\/api\/user\/?$/) || url.match(/^\/user\/?$/))) {
    const updateData = config.data;
    const currentUserId = "5"; // Simulate logged-in user as ID '5' (Head Owner)

    const updatedUser = mockStore.updateUser(currentUserId, updateData);

    if (updatedUser) {
      return createResponse(
        {
          success: true,
          data: {
            message: "User updated successfully",
          },
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "Failed to update user",
        },
        500,
        config,
      );
    }
  }

  // DELETE /users/{userId} - Delete user
  if (method === "DELETE" && url.match(/^\/api\/users\/[^/]+\/?$/)) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const success = mockStore.deleteUser(id);

    if (success) {
      return createResponse(
        {
          success: true,
          data: {
            message: "User deleted successfully",
          },
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "User not found",
        },
        404,
        config,
      );
    }
  }

  // Alternative DELETE pattern without /api
  if (method === "DELETE" && url.match(/^\/users\/[^/]+\/?$/)) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const success = mockStore.deleteUser(id);

    if (success) {
      return createResponse(
        {
          success: true,
          data: {
            message: "User deleted successfully",
          },
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "User not found",
        },
        404,
        config,
      );
    }
  }

  // Fallback for unhandled user endpoints
  return createResponse(
    {
      success: false,
      message: "Mock endpoint not implemented",
    },
    501,
    config,
  );
}

/**
 * Handle branches endpoints
 */
function handleBranchesEndpoint(
  url: string,
  method = "GET",
  config: InternalAxiosRequestConfig,
): MockResponse {
  // GET /branches - Get branches with pagination, sorting, and search
  if (method === "GET" && (url.match(/^\/api\/branches\/?$/) || url.match(/^\/branches\/?$/))) {
    // Extract query parameters
    const params = config.params || {};
    const page = params.page !== undefined ? Number(params.page) : 0;
    const limit = params.limit !== undefined ? Number(params.limit) : 10;
    const sortField = params.sortField || "createdAt";
    const sortOrder = params.sortOrder || "descend";
    const query = params.query || "";

    const paginatedData = mockStore.getBranches({
      page,
      limit,
      sortField,
      sortOrder,
      query,
    });

    return createResponse(
      {
        success: true,
        data: paginatedData,
      },
      200,
      config,
    );
  }

  // GET /branches/:id - Get branch by ID
  if (
    method === "GET" &&
    (url.match(/^\/api\/branches\/[^/]+\/?$/) || url.match(/^\/branches\/[^/]+\/?$/))
  ) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const branch = mockStore.getBranchById(id);

    if (branch) {
      return createResponse(
        {
          success: true,
          data: branch,
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "Branch not found",
        },
        404,
        config,
      );
    }
  }

  // POST /branches - Create branch
  if (method === "POST" && (url.match(/^\/api\/branches\/?$/) || url.match(/^\/branches\/?$/))) {
    const branchData = config.data;

    try {
      const newBranch = mockStore.createBranch(branchData);

      return createResponse(
        {
          success: true,
          data: newBranch,
          message: "Branch created successfully",
        },
        201,
        config,
      );
    } catch (error) {
      return createResponse(
        {
          success: false,
          message: error instanceof Error ? error.message : "Failed to create branch",
        },
        400,
        config,
      );
    }
  }

  // PUT /branches/:id - Update branch
  if (
    method === "PUT" &&
    (url.match(/^\/api\/branches\/[^/]+\/?$/) || url.match(/^\/branches\/[^/]+\/?$/))
  ) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const updateData = config.data;

    const updatedBranch = mockStore.updateBranch(id, updateData);

    if (updatedBranch) {
      return createResponse(
        {
          success: true,
          data: updatedBranch,
          message: "Branch updated successfully",
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "Branch not found",
        },
        404,
        config,
      );
    }
  }

  // DELETE /branches/:id - Delete branch
  if (
    method === "DELETE" &&
    (url.match(/^\/api\/branches\/[^/]+\/?$/) || url.match(/^\/branches\/[^/]+\/?$/))
  ) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const success = mockStore.deleteBranch(id);

    if (success) {
      return createResponse(
        {
          success: true,
          data: {
            message: "Branch deleted successfully",
          },
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "Branch not found",
        },
        404,
        config,
      );
    }
  }

  // Fallback for unhandled branch endpoints
  return createResponse(
    {
      success: false,
      message: "Mock branch endpoint not implemented",
    },
    501,
    config,
  );
}

/**
 * Handle outside brokers endpoints
 */
function handleOutsideBrokersEndpoint(
  url: string,
  method = "GET",
  config: InternalAxiosRequestConfig,
): MockResponse {
  // GET /outside-brokers - Get outside brokers with pagination, sorting, and search
  if (
    method === "GET" &&
    (url.match(/^\/api\/outside-brokers\/?$/) || url.match(/^\/outside-brokers\/?$/))
  ) {
    // Extract query parameters
    const params = config.params || {};
    const page = params.page !== undefined ? Number(params.page) : 0;
    const limit = params.limit !== undefined ? Number(params.limit) : 10;
    const sortField = params.sortField || "createdAt";
    const sortOrder = params.sortOrder || "descend";
    const query = params.query || "";

    const paginatedData = mockStore.getOutsideBrokers({
      page,
      limit,
      sortField,
      sortOrder,
      query,
    });

    return createResponse(
      {
        success: true,
        data: paginatedData,
      },
      200,
      config,
    );
  }

  // GET /outside-brokers/:id - Get outside broker by ID
  if (
    method === "GET" &&
    (url.match(/^\/api\/outside-brokers\/[^/]+\/?$/) || url.match(/^\/outside-brokers\/[^/]+\/?$/))
  ) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const broker = mockStore.getOutsideBrokerById(id);

    if (broker) {
      return createResponse(
        {
          success: true,
          data: broker,
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "Outside broker not found",
        },
        404,
        config,
      );
    }
  }

  // POST /outside-brokers - Create outside broker
  if (
    method === "POST" &&
    (url.match(/^\/api\/outside-brokers\/?$/) || url.match(/^\/outside-brokers\/?$/))
  ) {
    const brokerData = config.data;

    try {
      const newBroker = mockStore.createOutsideBroker(brokerData);

      return createResponse(
        {
          success: true,
          data: newBroker,
          message: "Outside broker created successfully",
        },
        201,
        config,
      );
    } catch (error) {
      return createResponse(
        {
          success: false,
          message: error instanceof Error ? error.message : "Failed to create outside broker",
        },
        400,
        config,
      );
    }
  }

  // PUT /outside-brokers/:id - Update outside broker
  if (
    method === "PUT" &&
    (url.match(/^\/api\/outside-brokers\/[^/]+\/?$/) || url.match(/^\/outside-brokers\/[^/]+\/?$/))
  ) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const updateData = config.data;

    try {
      const updatedBroker = mockStore.updateOutsideBroker(id, updateData);

      if (updatedBroker) {
        return createResponse(
          {
            success: true,
            data: updatedBroker,
            message: "Outside broker updated successfully",
          },
          200,
          config,
        );
      } else {
        return createResponse(
          {
            success: false,
            message: "Outside broker not found",
          },
          404,
          config,
        );
      }
    } catch (error) {
      return createResponse(
        {
          success: false,
          message: error instanceof Error ? error.message : "Failed to update outside broker",
        },
        400,
        config,
      );
    }
  }

  // DELETE /outside-brokers/:id - Delete outside broker
  if (
    method === "DELETE" &&
    (url.match(/^\/api\/outside-brokers\/[^/]+\/?$/) || url.match(/^\/outside-brokers\/[^/]+\/?$/))
  ) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const success = mockStore.deleteOutsideBroker(id);

    if (success) {
      return createResponse(
        {
          success: true,
          data: {
            message: "Outside broker deleted successfully",
          },
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "Outside broker not found",
        },
        404,
        config,
      );
    }
  }

  // Fallback for unhandled outside broker endpoints
  return createResponse(
    {
      success: false,
      message: "Mock outside broker endpoint not implemented",
    },
    501,
    config,
  );
}

/**
 * Handle outside carriers endpoints
 */
function handleOutsideCarriersEndpoint(
  url: string,
  method = "GET",
  config: InternalAxiosRequestConfig,
): MockResponse {
  // GET /outside-carriers - Get outside carriers with pagination, sorting, and search
  if (
    method === "GET" &&
    (url.match(/^\/api\/outside-carriers\/?$/) || url.match(/^\/outside-carriers\/?$/))
  ) {
    // Extract query parameters
    const params = config.params || {};
    const page = params.page !== undefined ? Number(params.page) : 0;
    const limit = params.limit !== undefined ? Number(params.limit) : 10;
    const sortField = params.sortField || "createdAt";
    const sortOrder = params.sortOrder || "descend";
    const query = params.query || "";

    const paginatedData = mockStore.getOutsideCarriers({
      page,
      limit,
      sortField,
      sortOrder,
      query,
    });

    return createResponse(
      {
        success: true,
        data: paginatedData,
      },
      200,
      config,
    );
  }

  // GET /outside-carriers/:id - Get outside carrier by ID
  if (
    method === "GET" &&
    (url.match(/^\/api\/outside-carriers\/[^/]+\/?$/) ||
      url.match(/^\/outside-carriers\/[^/]+\/?$/))
  ) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const carrier = mockStore.getOutsideCarrierById(id);

    if (carrier) {
      return createResponse(
        {
          success: true,
          data: carrier,
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "Outside carrier not found",
        },
        404,
        config,
      );
    }
  }

  // POST /outside-carriers - Create outside carrier
  if (
    method === "POST" &&
    (url.match(/^\/api\/outside-carriers\/?$/) || url.match(/^\/outside-carriers\/?$/))
  ) {
    const carrierData = config.data;

    try {
      const newCarrier = mockStore.createOutsideCarrier(carrierData);

      return createResponse(
        {
          success: true,
          data: newCarrier,
          message: "Outside carrier created successfully",
        },
        201,
        config,
      );
    } catch (error) {
      return createResponse(
        {
          success: false,
          message: error instanceof Error ? error.message : "Failed to create outside carrier",
        },
        400,
        config,
      );
    }
  }

  // PUT /outside-carriers/:id - Update outside carrier
  if (
    method === "PUT" &&
    (url.match(/^\/api\/outside-carriers\/[^/]+\/?$/) ||
      url.match(/^\/outside-carriers\/[^/]+\/?$/))
  ) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const updateData = config.data;

    try {
      const updatedCarrier = mockStore.updateOutsideCarrier(id, updateData);

      if (updatedCarrier) {
        return createResponse(
          {
            success: true,
            data: updatedCarrier,
            message: "Outside carrier updated successfully",
          },
          200,
          config,
        );
      } else {
        return createResponse(
          {
            success: false,
            message: "Outside carrier not found",
          },
          404,
          config,
        );
      }
    } catch (error) {
      return createResponse(
        {
          success: false,
          message: error instanceof Error ? error.message : "Failed to update outside carrier",
        },
        400,
        config,
      );
    }
  }

  // DELETE /outside-carriers/:id - Delete outside carrier
  if (
    method === "DELETE" &&
    (url.match(/^\/api\/outside-carriers\/[^/]+\/?$/) ||
      url.match(/^\/outside-carriers\/[^/]+\/?$/))
  ) {
    const id = url.split("/").filter(Boolean).pop() || "";
    const success = mockStore.deleteOutsideCarrier(id);

    if (success) {
      return createResponse(
        {
          success: true,
          data: {
            message: "Outside carrier deleted successfully",
          },
        },
        200,
        config,
      );
    } else {
      return createResponse(
        {
          success: false,
          message: "Outside carrier not found",
        },
        404,
        config,
      );
    }
  }

  // Fallback for unhandled outside carrier endpoints
  return createResponse(
    {
      success: false,
      message: "Mock outside carrier endpoint not implemented",
    },
    501,
    config,
  );
}

/**
 * Create a standardized mock response matching ApiResponse<T> format
 */
function createResponse(
  data: MockPayload,
  status: number,
  config: InternalAxiosRequestConfig,
): MockResponse {
  // Transform to ApiResponse format: { data: T, requestId: string, error?: string }
  const responseData = {
    data: data.data !== undefined ? data.data : null,
    requestId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    error: data.success === false ? data.message || "An error occurred" : undefined,
  };

  return {
    data: responseData,
    status,
    statusText: status === 200 || status === 201 ? "OK" : "Error",
    headers: {
      "content-type": "application/json",
    },
    config,
  };
}

export default { init };
