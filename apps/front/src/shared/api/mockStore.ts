import type { User, UserFormData, UserRole } from '@/entities/user/types'
import type { Branch, BranchFormData } from '@/entities/branch/types'
import type { OutsideBroker, OutsideBrokerFormData } from '@/entities/outside-broker/types'
import { BrokerStatus } from '@/entities/outside-broker/types'
import type { OutsideCarrier, OutsideCarrierFormData } from '@/entities/outside-carrier/types'
import { CarrierStatus, InsuranceStatus } from '@/entities/outside-carrier/types'

/**
 * Mock Data Store
 * Manages in-memory mock data for different entities
 */

class MockDataStore {
  private users: User[] = []
  private userIdCounter = 1
  private branches: Branch[] = []
  private branchIdCounter = 1
  private outsideBrokers: OutsideBroker[] = []
  private outsideBrokerIdCounter = 1
  private outsideCarriers: OutsideCarrier[] = []
  private outsideCarrierIdCounter = 1

  constructor() {
    this.initializeBranches()
    this.initializeUsers()
    this.initializeOutsideBrokers()
    this.initializeOutsideCarriers()
  }

  // Initialize branch mock data
  private initializeBranches() {
    this.branches = [
      {
        id: 'branch1',
        name: 'Main Store',
        contact: '1-555-1234',
        owner: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'branch2',
        name: 'West Side',
        contact: null,
        owner: {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
        },
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'branch3',
        name: 'East Branch',
        contact: '1-555-5678',
        owner: {
          id: '5',
          firstName: 'Michael',
          lastName: 'Brown',
          email: 'michael.brown@example.com',
        },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]
    this.branchIdCounter = 4
  }

  // Initialize with some default mock data
  private initializeUsers() {
    this.users = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        isActive: true,
        role: 'Owner' as UserRole,
        registeredDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        branchId: 'branch1',
        branchName: 'Main Branch',
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        isActive: true,
        role: 'Head Accountant' as UserRole,
        registeredDate: new Date(Date.now() - 86400000).toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        branchId: 'branch1',
        branchName: 'Main Branch',
      },
      {
        id: '3',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@example.com',
        isActive: false,
        role: 'Agent' as UserRole,
        registeredDate: new Date(Date.now() - 172800000).toISOString(),
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        branchId: 'branch2',
        branchName: 'Secondary Branch',
      },
      {
        id: '4',
        firstName: 'Alice',
        lastName: 'Williams',
        email: 'alice.williams@example.com',
        isActive: true,
        role: 'Carrier' as UserRole,
        registeredDate: new Date(Date.now() - 259200000).toISOString(),
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        branchId: 'branch3',
        branchName: 'Regional Branch',
      },
      {
        id: '5',
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'michael.brown@example.com',
        isActive: true,
        role: 'Head Owner' as UserRole,
        registeredDate: new Date(Date.now() - 345600000).toISOString(),
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        branchId: 'branch1',
        branchName: 'Main Branch',
      },
      {
        id: '6',
        firstName: 'Sarah',
        lastName: 'Davis',
        email: 'sarah.davis@example.com',
        isActive: true,
        role: 'Accountant' as UserRole,
        registeredDate: new Date(Date.now() - 432000000).toISOString(),
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        branchId: 'branch2',
        branchName: 'Secondary Branch',
      },
    ]
    this.userIdCounter = 7
  }

  // User CRUD operations with pagination and sorting
  getUsers(params?: { page?: number; limit?: number; sortField?: string; sortOrder?: 'ascend' | 'descend'; query?: string }) {
    const page = params?.page ?? 0
    const limit = params?.limit ?? 5
    const sortField = params?.sortField ?? 'createdAt'
    const sortOrder = params?.sortOrder ?? 'descend'
    const query = params?.query?.toLowerCase() ?? ''

    console.log('📋 Getting users from mock store with params:', params)

    // Filter by search query
    let filteredUsers = [...this.users]
    if (query) {
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.firstName.toLowerCase().includes(query) || user.lastName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
      )
    }

    // Sort users
    filteredUsers.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'firstName':
          aValue = a.firstName.toLowerCase()
          bValue = b.firstName.toLowerCase()
          break
        case 'lastName':
          aValue = a.lastName.toLowerCase()
          bValue = b.lastName.toLowerCase()
          break
        case 'email':
          aValue = a.email.toLowerCase()
          bValue = b.email.toLowerCase()
          break
        case 'role':
          aValue = a.role
          bValue = b.role
          break
        case 'isActive':
          aValue = a.isActive ? 1 : 0
          bValue = b.isActive ? 1 : 0
          break
        case 'branch':
          aValue = a.branchName?.toLowerCase() ?? ''
          bValue = b.branchName?.toLowerCase() ?? ''
          break
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt || a.registeredDate).getTime()
          bValue = new Date(b.createdAt || b.registeredDate).getTime()
          break
      }

      if (aValue < bValue) return sortOrder === 'ascend' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'ascend' ? 1 : -1
      return 0
    })

    // Paginate
    const total = filteredUsers.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = page * limit
    const endIndex = startIndex + limit
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

    console.log(`📊 Returning ${paginatedUsers.length} users (page ${page + 1}/${totalPages}, total: ${total})`)

    return {
      users: paginatedUsers,
      total,
      page,
      limit,
      totalPages,
    }
  }

  // Get all users without pagination (for backward compatibility)
  getAllUsers(): User[] {
    return [...this.users]
  }

  getUserById(id: string): User | undefined {
    return this.users.find((user) => user.id === id)
  }

  createUser(data: UserFormData): User {
    const newUser: User = {
      id: String(this.userIdCounter++),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      isActive: data.isActive,
      role: data.role,
      registeredDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      branchId: data.branch, // For backward compatibility
      branchName: this.getBranchName(data.branch),
    }
    this.users.push(newUser)
    console.log('✅ User added to mock store:', newUser)
    console.log('📊 Total users in store:', this.users.length)
    return newUser
  }

  updateUser(id: string, data: any): User | null {
    const index = this.users.findIndex((user) => user.id === id)
    if (index === -1) return null

    // Handle branch field (new) and branchId (legacy) for backward compatibility
    const branchId = data.branch || data.branchId

    this.users[index] = {
      ...this.users[index],
      ...data,
      id, // Ensure id doesn't change
      branchId: branchId || this.users[index].branchId,
      branchName: branchId ? this.getBranchName(branchId) : this.users[index].branchName,
    }

    // Remove the 'branch' field if it exists (it's sent in request but not stored)
    if ('branch' in this.users[index]) {
      delete (this.users[index] as any).branch
    }

    return this.users[index]
  }

  deleteUser(id: string): boolean {
    const index = this.users.findIndex((user) => user.id === id)
    if (index === -1) return false

    this.users.splice(index, 1)
    return true
  }

  // Helper method to get branch name
  private getBranchName(branchId: string): string {
    const branch = this.branches.find((b) => b.id === branchId)
    return branch?.name || 'Unknown Branch'
  }

  // Branch CRUD operations with pagination and sorting
  getBranches(params?: { page?: number; limit?: number; sortField?: string; sortOrder?: 'ascend' | 'descend'; query?: string }) {
    const page = params?.page ?? 0
    const limit = params?.limit ?? 10
    const sortField = params?.sortField ?? 'createdAt'
    const sortOrder = params?.sortOrder ?? 'descend'
    const query = params?.query?.toLowerCase() ?? ''

    console.log('📋 Getting branches from mock store with params:', params)

    // Filter by search query
    let filteredBranches = [...this.branches]
    if (query) {
      filteredBranches = filteredBranches.filter(
        (branch) =>
          branch.name.toLowerCase().includes(query) ||
          (branch.contact && branch.contact.toLowerCase().includes(query)) ||
          (branch.owner && `${branch.owner.firstName} ${branch.owner.lastName}`.toLowerCase().includes(query))
      )
    }

    // Sort branches
    filteredBranches.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'owner':
          aValue = a.owner ? `${a.owner.firstName} ${a.owner.lastName}`.toLowerCase() : ''
          bValue = b.owner ? `${b.owner.firstName} ${b.owner.lastName}`.toLowerCase() : ''
          break
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt || 0).getTime()
          bValue = new Date(b.createdAt || 0).getTime()
          break
      }

      if (aValue < bValue) return sortOrder === 'ascend' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'ascend' ? 1 : -1
      return 0
    })

    // Paginate
    const total = filteredBranches.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = page * limit
    const endIndex = startIndex + limit
    const paginatedBranches = filteredBranches.slice(startIndex, endIndex)

    console.log(`📊 Returning ${paginatedBranches.length} branches (page ${page + 1}/${totalPages}, total: ${total})`)

    return {
      branches: paginatedBranches,
      total,
    }
  }

  getBranchById(id: string): Branch | undefined {
    return this.branches.find((branch) => branch.id === id)
  }

  createBranch(data: BranchFormData): Branch {
    // Check for duplicate branch name
    const existingBranch = this.branches.find((b) => b.name.toLowerCase() === data.name.toLowerCase())

    if (existingBranch) {
      const error = new Error('duplicate key value violates unique constraint "branch_name_key"')
      ;(error as any).response = {
        data: {
          error: 'duplicate key value violates unique constraint "branch_name_key"',
        },
      }
      throw error
    }

    // Get owner details from users (owner is required)
    const owner = this.users.find((u) => u.id === data.owner)

    if (!owner) {
      throw new Error('Owner not found')
    }

    const ownerData = {
      id: owner.id,
      firstName: owner.firstName,
      lastName: owner.lastName,
      email: owner.email,
    }

    const newBranch: Branch = {
      id: `branch${this.branchIdCounter++}`,
      name: data.name,
      contact: data.contact || null,
      owner: ownerData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.branches.push(newBranch)
    console.log('✅ Branch added to mock store:', newBranch)
    console.log('📊 Total branches in store:', this.branches.length)
    return newBranch
  }

  updateBranch(id: string, data: Partial<BranchFormData>): Branch | null {
    const index = this.branches.findIndex((branch) => branch.id === id)
    if (index === -1) return null

    const branch = this.branches[index]

    // Check for duplicate branch name (if name is being updated)
    if (data.name !== undefined) {
      const existingBranch = this.branches.find((b) => b.id !== id && b.name.toLowerCase() === data.name.toLowerCase())

      if (existingBranch) {
        const error = new Error('duplicate key value violates unique constraint "branch_name_key"')
        ;(error as any).response = {
          data: {
            error: 'duplicate key value violates unique constraint "branch_name_key"',
          },
        }
        throw error
      }
    }

    let ownerData = branch.owner

    // Update owner if provided
    if (data.owner !== undefined) {
      if (data.owner) {
        const owner = this.users.find((u) => u.id === data.owner)
        if (owner) {
          ownerData = {
            id: owner.id,
            firstName: owner.firstName,
            lastName: owner.lastName,
            email: owner.email,
          }
        }
      } else {
        ownerData = null
      }
    }

    this.branches[index] = {
      ...branch,
      name: data.name !== undefined ? data.name : branch.name,
      contact: data.contact !== undefined ? data.contact || null : branch.contact,
      owner: ownerData,
      updatedAt: new Date().toISOString(),
    }

    console.log('✅ Branch updated in mock store:', this.branches[index])
    return this.branches[index]
  }

  deleteBranch(id: string): boolean {
    const index = this.branches.findIndex((branch) => branch.id === id)
    if (index === -1) return false

    this.branches.splice(index, 1)
    console.log('✅ Branch deleted from mock store, ID:', id)
    console.log('📊 Total branches in store:', this.branches.length)
    return true
  }

  // Initialize outside brokers mock data
  private initializeOutsideBrokers() {
    this.outsideBrokers = [
      {
        id: 'broker1',
        brokerName: 'ABC Logistics',
        mcNumber: 'MC123456',
        contactName: 'John Smith',
        phone: '555-0101',
        email: 'john@abclogistics.com',
        address: '123 Main St, City, State 12345',
        notes: 'Reliable broker, good payment history',
        status: BrokerStatus.APPROVED,
        branch: {
          id: 'branch1',
          name: 'Main Store',
        },
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'broker2',
        brokerName: 'XYZ Transport',
        mcNumber: 'MC789012',
        contactName: 'Jane Doe',
        phone: '555-0202',
        email: 'jane@xyztransport.com',
        address: '456 Oak Ave, City, State 67890',
        notes: 'Pending review',
        status: BrokerStatus.PENDING,
        branch: null,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'broker3',
        brokerName: 'Blacklisted Broker Co',
        mcNumber: 'MC345678',
        contactName: 'Bob Johnson',
        phone: '555-0303',
        email: 'bob@blacklisted.com',
        address: '789 Pine Rd, City, State 11111',
        notes: 'Multiple payment issues, do not work with',
        status: BrokerStatus.DENIED,
        branch: {
          id: 'branch2',
          name: 'West Side',
        },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'broker4',
        brokerName: 'Fast Freight Solutions',
        mcNumber: 'MC901234',
        contactName: 'Alice Williams',
        phone: '555-0404',
        email: 'alice@fastfreight.com',
        address: '321 Elm St, City, State 22222',
        notes: null,
        status: BrokerStatus.APPROVED,
        branch: null,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]
    this.outsideBrokerIdCounter = 5
  }

  // Outside Brokers CRUD operations with pagination and sorting
  getOutsideBrokers(params?: { page?: number; limit?: number; sortField?: string; sortOrder?: 'ascend' | 'descend'; query?: string }) {
    const page = params?.page ?? 0
    const limit = params?.limit ?? 10
    const sortField = params?.sortField ?? 'createdAt'
    const sortOrder = params?.sortOrder ?? 'descend'
    const query = params?.query?.toLowerCase() ?? ''

    console.log('📋 Getting outside brokers from mock store with params:', params)

    // Filter by search query
    let filteredBrokers = [...this.outsideBrokers]
    if (query) {
      filteredBrokers = filteredBrokers.filter(
        (broker) =>
          broker.brokerName.toLowerCase().includes(query) ||
          broker.mcNumber.toLowerCase().includes(query) ||
          (broker.contactName && broker.contactName.toLowerCase().includes(query)) ||
          (broker.email && broker.email.toLowerCase().includes(query)) ||
          (broker.phone && broker.phone.toLowerCase().includes(query))
      )
    }

    // Sort brokers
    filteredBrokers.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'brokerName':
          aValue = a.brokerName.toLowerCase()
          bValue = b.brokerName.toLowerCase()
          break
        case 'mcNumber':
          aValue = a.mcNumber.toLowerCase()
          bValue = b.mcNumber.toLowerCase()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'branch':
          aValue = a.branch?.name?.toLowerCase() ?? ''
          bValue = b.branch?.name?.toLowerCase() ?? ''
          break
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt || 0).getTime()
          bValue = new Date(b.createdAt || 0).getTime()
          break
      }

      if (aValue < bValue) return sortOrder === 'ascend' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'ascend' ? 1 : -1
      return 0
    })

    // Paginate
    const total = filteredBrokers.length
    const startIndex = page * limit
    const endIndex = startIndex + limit
    const paginatedBrokers = filteredBrokers.slice(startIndex, endIndex)

    console.log(`📊 Returning ${paginatedBrokers.length} brokers (page ${page + 1}/${Math.ceil(total / limit)}, total: ${total})`)

    return {
      brokers: paginatedBrokers,
      total,
    }
  }

  getOutsideBrokerById(id: string): OutsideBroker | undefined {
    return this.outsideBrokers.find((broker) => broker.id === id)
  }

  createOutsideBroker(data: OutsideBrokerFormData): OutsideBroker {
    // Check for duplicate MC number
    const existingBroker = this.outsideBrokers.find((b) => b.mcNumber.toLowerCase() === data.mcNumber.toLowerCase())

    if (existingBroker) {
      const error = new Error('duplicate key value violates unique constraint "outside_broker_mc_number_key"')
      ;(error as any).response = {
        data: {
          error: 'duplicate key value violates unique constraint "outside_broker_mc_number_key"',
        },
      }
      throw error
    }

    // Get branch details if provided
    let branchData = null
    if (data.branch) {
      const branch = this.branches.find((b) => b.id === data.branch)
      if (branch) {
        branchData = {
          id: branch.id,
          name: branch.name,
        }
      }
    }

    const newBroker: OutsideBroker = {
      id: `broker${this.outsideBrokerIdCounter++}`,
      brokerName: data.brokerName,
      mcNumber: data.mcNumber,
      contactName: data.contactName || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      notes: data.notes || null,
      status: data.status,
      branch: branchData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.outsideBrokers.push(newBroker)
    console.log('✅ Outside broker added to mock store:', newBroker)
    console.log('📊 Total brokers in store:', this.outsideBrokers.length)
    return newBroker
  }

  updateOutsideBroker(id: string, data: Partial<OutsideBrokerFormData>): OutsideBroker | null {
    const index = this.outsideBrokers.findIndex((broker) => broker.id === id)
    if (index === -1) return null

    const broker = this.outsideBrokers[index]

    // Check for duplicate MC number (if MC number is being updated)
    if (data.mcNumber !== undefined) {
      const existingBroker = this.outsideBrokers.find((b) => b.id !== id && b.mcNumber.toLowerCase() === data.mcNumber.toLowerCase())

      if (existingBroker) {
        const error = new Error('duplicate key value violates unique constraint "outside_broker_mc_number_key"')
        ;(error as any).response = {
          data: {
            error: 'duplicate key value violates unique constraint "outside_broker_mc_number_key"',
          },
        }
        throw error
      }
    }

    // Get branch details if provided
    let branchData = broker.branch
    if (data.branch !== undefined) {
      if (data.branch) {
        const branch = this.branches.find((b) => b.id === data.branch)
        if (branch) {
          branchData = {
            id: branch.id,
            name: branch.name,
          }
        }
      } else {
        branchData = null
      }
    }

    this.outsideBrokers[index] = {
      ...broker,
      brokerName: data.brokerName !== undefined ? data.brokerName : broker.brokerName,
      mcNumber: data.mcNumber !== undefined ? data.mcNumber : broker.mcNumber,
      contactName: data.contactName !== undefined ? data.contactName || null : broker.contactName,
      phone: data.phone !== undefined ? data.phone || null : broker.phone,
      email: data.email !== undefined ? data.email || null : broker.email,
      address: data.address !== undefined ? data.address || null : broker.address,
      notes: data.notes !== undefined ? data.notes || null : broker.notes,
      status: data.status !== undefined ? data.status : broker.status,
      branch: branchData,
      updatedAt: new Date().toISOString(),
    }

    console.log('✅ Outside broker updated in mock store:', this.outsideBrokers[index])
    return this.outsideBrokers[index]
  }

  deleteOutsideBroker(id: string): boolean {
    const index = this.outsideBrokers.findIndex((broker) => broker.id === id)
    if (index === -1) return false

    this.outsideBrokers.splice(index, 1)
    console.log('✅ Outside broker deleted from mock store, ID:', id)
    console.log('📊 Total brokers in store:', this.outsideBrokers.length)
    return true
  }

  // Initialize outside carriers mock data
  private initializeOutsideCarriers() {
    const now = Date.now()
    this.outsideCarriers = [
      {
        id: 'carrier1',
        carrierName: 'Swift Transport',
        mcDotNumber: 'MC789012',
        equipmentType: 'Dry Van',
        insuranceStatus: InsuranceStatus.VALID,
        insuranceExpiry: new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString(),
        phone: '555-0201',
        email: 'contact@swifttransport.com',
        notes: 'Reliable carrier, good safety record',
        status: CarrierStatus.APPROVED,
        createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'carrier2',
        carrierName: 'Fast Freight Lines',
        mcDotNumber: 'DOT456789',
        equipmentType: 'Flatbed',
        insuranceStatus: InsuranceStatus.VALID,
        insuranceExpiry: new Date(now + 60 * 24 * 60 * 60 * 1000).toISOString(),
        phone: '555-0302',
        email: 'info@fastfreight.com',
        notes: 'Specializes in oversized loads',
        status: CarrierStatus.APPROVED,
        createdAt: new Date(now - 25 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'carrier3',
        carrierName: 'Cold Chain Logistics',
        mcDotNumber: 'MC321654',
        equipmentType: 'Refrigerated',
        insuranceStatus: InsuranceStatus.EXPIRED,
        insuranceExpiry: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
        phone: '555-0403',
        email: 'support@coldchain.com',
        notes: 'Insurance expired, needs renewal',
        status: CarrierStatus.DENIED,
        createdAt: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'carrier4',
        carrierName: 'Express Delivery Co',
        mcDotNumber: 'DOT987654',
        equipmentType: 'Box Truck',
        insuranceStatus: InsuranceStatus.PENDING,
        insuranceExpiry: null,
        phone: '555-0504',
        email: null,
        notes: 'New carrier, insurance verification pending',
        status: CarrierStatus.DENIED,
        createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'carrier5',
        carrierName: 'Heavy Haul Specialists',
        mcDotNumber: 'MC147258',
        equipmentType: 'Lowboy',
        insuranceStatus: InsuranceStatus.VALID,
        insuranceExpiry: new Date(now + 120 * 24 * 60 * 60 * 1000).toISOString(),
        phone: '555-0605',
        email: 'dispatch@heavyhaul.com',
        notes: 'Premium carrier for heavy equipment',
        status: CarrierStatus.APPROVED,
        createdAt: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]
    this.outsideCarrierIdCounter = 6
  }

  // Outside Carriers CRUD operations with pagination and sorting
  getOutsideCarriers(params?: { page?: number; limit?: number; sortField?: string; sortOrder?: 'ascend' | 'descend'; query?: string }) {
    const page = params?.page ?? 0
    const limit = params?.limit ?? 10
    const sortField = params?.sortField ?? 'createdAt'
    const sortOrder = params?.sortOrder ?? 'descend'
    const query = params?.query?.toLowerCase() ?? ''

    console.log('📋 Getting outside carriers from mock store with params:', params)

    // Filter by search query
    let filteredCarriers = [...this.outsideCarriers]
    if (query) {
      filteredCarriers = filteredCarriers.filter(
        (carrier) =>
          carrier.carrierName.toLowerCase().includes(query) ||
          carrier.mcDotNumber.toLowerCase().includes(query) ||
          (carrier.equipmentType && carrier.equipmentType.toLowerCase().includes(query)) ||
          (carrier.phone && carrier.phone.toLowerCase().includes(query)) ||
          (carrier.email && carrier.email.toLowerCase().includes(query))
      )
    }

    // Sort carriers
    filteredCarriers.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'carrierName':
          aValue = a.carrierName.toLowerCase()
          bValue = b.carrierName.toLowerCase()
          break
        case 'mcDotNumber':
          aValue = a.mcDotNumber.toLowerCase()
          bValue = b.mcDotNumber.toLowerCase()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'insuranceStatus':
          aValue = a.insuranceStatus
          bValue = b.insuranceStatus
          break
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt || 0).getTime()
          bValue = new Date(b.createdAt || 0).getTime()
          break
      }

      if (aValue < bValue) return sortOrder === 'ascend' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'ascend' ? 1 : -1
      return 0
    })

    // Paginate
    const total = filteredCarriers.length
    const startIndex = page * limit
    const endIndex = startIndex + limit
    const paginatedCarriers = filteredCarriers.slice(startIndex, endIndex)

    console.log(`📊 Returning ${paginatedCarriers.length} carriers (page ${page + 1}/${Math.ceil(total / limit)}, total: ${total})`)

    return {
      carriers: paginatedCarriers,
      total,
    }
  }

  getOutsideCarrierById(id: string): OutsideCarrier | undefined {
    return this.outsideCarriers.find((carrier) => carrier.id === id)
  }

  createOutsideCarrier(data: OutsideCarrierFormData): OutsideCarrier {
    // Check for duplicate MC/DOT number
    const existingCarrier = this.outsideCarriers.find((c) => c.mcDotNumber.toLowerCase() === data.mcDotNumber.toLowerCase())

    if (existingCarrier) {
      const error = new Error('duplicate key value violates unique constraint "outside_carrier_mc_dot_number_key"')
      ;(error as any).response = {
        data: {
          error: 'duplicate key value violates unique constraint "outside_carrier_mc_dot_number_key"',
        },
      }
      throw error
    }

    // Calculate insurance status based on expiry date
    let insuranceStatus = InsuranceStatus.PENDING
    if (data.insuranceExpiry) {
      const expiryDate = new Date(data.insuranceExpiry)
      const now = new Date()
      if (expiryDate > now) {
        insuranceStatus = InsuranceStatus.VALID
      } else {
        insuranceStatus = InsuranceStatus.EXPIRED
      }
    }

    const newCarrier: OutsideCarrier = {
      id: `carrier${this.outsideCarrierIdCounter++}`,
      carrierName: data.carrierName,
      mcDotNumber: data.mcDotNumber,
      equipmentType: data.equipmentType || null,
      insuranceStatus,
      insuranceExpiry: data.insuranceExpiry || null,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
      status: data.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.outsideCarriers.push(newCarrier)
    console.log('✅ Outside carrier added to mock store:', newCarrier)
    console.log('📊 Total carriers in store:', this.outsideCarriers.length)
    return newCarrier
  }

  updateOutsideCarrier(id: string, data: Partial<OutsideCarrierFormData>): OutsideCarrier | null {
    const index = this.outsideCarriers.findIndex((carrier) => carrier.id === id)
    if (index === -1) return null

    const carrier = this.outsideCarriers[index]

    // Check for duplicate MC/DOT number (if MC/DOT number is being updated)
    if (data.mcDotNumber !== undefined) {
      const existingCarrier = this.outsideCarriers.find((c) => c.id !== id && c.mcDotNumber.toLowerCase() === data.mcDotNumber.toLowerCase())

      if (existingCarrier) {
        const error = new Error('duplicate key value violates unique constraint "outside_carrier_mc_dot_number_key"')
        ;(error as any).response = {
          data: {
            error: 'duplicate key value violates unique constraint "outside_carrier_mc_dot_number_key"',
          },
        }
        throw error
      }
    }

    // Calculate insurance status based on expiry date
    let insuranceStatus = carrier.insuranceStatus
    const insuranceExpiry = data.insuranceExpiry !== undefined ? data.insuranceExpiry : carrier.insuranceExpiry
    if (insuranceExpiry) {
      const expiryDate = new Date(insuranceExpiry)
      const now = new Date()
      if (expiryDate > now) {
        insuranceStatus = InsuranceStatus.VALID
      } else {
        insuranceStatus = InsuranceStatus.EXPIRED
      }
    } else {
      insuranceStatus = InsuranceStatus.PENDING
    }

    this.outsideCarriers[index] = {
      ...carrier,
      carrierName: data.carrierName !== undefined ? data.carrierName : carrier.carrierName,
      mcDotNumber: data.mcDotNumber !== undefined ? data.mcDotNumber : carrier.mcDotNumber,
      equipmentType: data.equipmentType !== undefined ? data.equipmentType || null : carrier.equipmentType,
      insuranceStatus,
      insuranceExpiry: insuranceExpiry || null,
      phone: data.phone !== undefined ? data.phone || null : carrier.phone,
      email: data.email !== undefined ? data.email || null : carrier.email,
      notes: data.notes !== undefined ? data.notes || null : carrier.notes,
      status: data.status !== undefined ? data.status : carrier.status,
      updatedAt: new Date().toISOString(),
    }

    console.log('✅ Outside carrier updated in mock store:', this.outsideCarriers[index])
    return this.outsideCarriers[index]
  }

  deleteOutsideCarrier(id: string): boolean {
    const index = this.outsideCarriers.findIndex((carrier) => carrier.id === id)
    if (index === -1) return false

    this.outsideCarriers.splice(index, 1)
    console.log('✅ Outside carrier deleted from mock store, ID:', id)
    console.log('📊 Total carriers in store:', this.outsideCarriers.length)
    return true
  }

  // Reset all data (useful for testing)
  reset() {
    this.initializeBranches()
    this.initializeUsers()
    this.initializeOutsideBrokers()
    this.initializeOutsideCarriers()
  }
}

// Export a singleton instance
export const mockStore = new MockDataStore()
