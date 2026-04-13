const protocolMiddleware = (req, res, next) => {
    const protocol = req.protocol;
    const host = req.get("host");
  
    req.serverUrl = `${protocol}://${host}`;
  
    req.buildFileUrl = (filePath) => {
      if (!filePath) return null;
  
      if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
        return filePath;
      }
  
      return `${req.serverUrl}${filePath}`;
    };
  
    next();
  };
  
  module.exports = protocolMiddleware;