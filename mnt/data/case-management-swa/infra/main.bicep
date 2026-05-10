@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Globally unique Static Web App name')
param staticWebAppName string

@description('Globally unique storage account name, lowercase letters and numbers only')
param storageAccountName string

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: ''
    branch: 'main'
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      appArtifactLocation: 'dist'
    }
  }
}

output staticWebAppName string = staticWebApp.name
output storageAccountName string = storage.name
output storageConnectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storage.listKeys().keys[0].value}'
