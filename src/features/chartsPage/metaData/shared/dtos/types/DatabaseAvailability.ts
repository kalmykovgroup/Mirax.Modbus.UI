// @ts-ignore
export enum DatabaseAvailability {
    Unknown = 0, // Not yet checked
    Online = 1,  // Connection established
    Offline = 2, // Connection failed
    // Can be extended if needed: AuthFailed, NetworkError, Timeout, etc.
}