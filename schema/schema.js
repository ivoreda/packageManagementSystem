export const typeDefs = `#graphql
scalar JSON
scalar Date

type BaseResponse {
    status: Boolean!
    message: String!
    data: Package
}

type LoginResponse {
  status: Boolean!
  message: String!
  data: Token 
}

type Token {
    token: String!
}

type Package {
    id: ID!
    name: String!
    description: String!
    price: Float!
    expirationDate: Date!
}

input PackageFilterInput {
  expirationDate: Date
  expirationDateBefore: Date
  expirationDateAfter: Date
}


type Query {
    getAllPackages(filter: PackageFilterInput): [Package]
    getSinglePackage(id: ID!): Package
}

type Mutation {
    updatePackage(id: ID!, request: updatePackageInput!): BaseResponse
    createPackage(request: createPackageInput!): BaseResponse
    deletePackage(id: ID!): BaseResponse

    createUser(request: createUserInput!): BaseResponse
    login(request: loginInput!): LoginResponse
}

input loginInput {
    userName: String!
    password: String!
}

input createPackageInput {
    name: String!
    description: String!
    price: Float!
    expirationDate: Date!
}
input updatePackageInput {
    name: String
    description: String
    price: Float
}

type User {
    userName: String!
    password: String!
    userType: String!
}

input createUserInput {
    userName: String!
    password: String!
    userType: String!
}
`