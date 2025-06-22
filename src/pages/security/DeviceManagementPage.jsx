import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import api from '../../services/api';

/**
 * Device Management Page
 * 
 * Allows users to view and manage their registered devices
 */
const DeviceManagementPage = () => {
  const [devices, setDevices] = useState([]);
  const [securityAnalysis, setSecurityAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);

  // Load devices and security analysis
  useEffect(() => {
    loadDevices();
    loadSecurityAnalysis();
  }, []);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      const response = await api.devices.getAll();
      if (response.success) {
        setDevices(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSecurityAnalysis = async () => {
    try {
      const response = await api.devices.getSecurityAnalysis();
      if (response.success) {
        setSecurityAnalysis(response.data);
      }
    } catch (err) {
      console.error('Failed to load security analysis:', err);
    }
  };

  const handleTrustDevice = async (deviceId, isTrusted) => {
    try {
      await api.devices.update(deviceId, { isTrusted });
      await loadDevices();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRevokeDevice = async () => {
    if (!selectedDevice) return;
    
    try {
      await api.devices.revoke(selectedDevice.id);
      setShowRevokeModal(false);
      setSelectedDevice(null);
      await loadDevices();
      await loadSecurityAnalysis();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRevokeAllDevices = async () => {
    try {
      const currentDeviceId = localStorage.getItem('currentDeviceId');
      await api.devices.revokeAll(currentDeviceId);
      setShowRevokeAllModal(false);
      await loadDevices();
      await loadSecurityAnalysis();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getRiskBadge = (riskScore) => {
    if (riskScore < 0.3) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Low Risk</span>;
    } else if (riskScore < 0.7) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Medium Risk</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">High Risk</span>;
    }
  };

  const getStatusBadge = (device) => {
    if (!device.isActive) {
      return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Revoked</span>;
    } else if (device.isTrusted) {
      return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Trusted</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Active</span>;
    }
  };

  const deviceColumns = [
    {
      key: 'deviceName',
      label: 'Device',
      render: (device) => (
        <div>
          <div className="font-medium text-gray-900">{device.deviceName}</div>
          <div className="text-sm text-gray-500">{device.metadata?.platform}</div>
        </div>
      )
    },
    // Show user column only for admin view (when userId is populated)
    ...(devices.length > 0 && devices[0].userId && typeof devices[0].userId === 'object' ? [{
      key: 'user',
      label: 'User',
      render: (device) => (
        <div>
          <div className="font-medium text-gray-900">{device.userId?.name || 'Unknown'}</div>
          <div className="text-sm text-gray-500">{device.userId?.email || ''}</div>
          <div className="text-xs text-gray-400">{device.userId?.role || ''}</div>
        </div>
      )
    }] : []),
    {
      key: 'location',
      label: 'Location & IP',
      render: (device) => (
        <div>
          <div className="text-sm text-gray-900">{device.ipAddress}</div>
          <div className="text-xs text-gray-500">{device.location?.timezone}</div>
        </div>
      )
    },
    {
      key: 'lastSeen',
      label: 'Last Seen',
      render: (device) => (
        <div>
          <div className="text-sm text-gray-900">{formatDate(device.lastSeen)}</div>
          <div className="text-xs text-gray-500">{device.loginCount} logins</div>
        </div>
      )
    },
    {
      key: 'riskScore',
      label: 'Risk Level',
      render: (device) => getRiskBadge(device.riskScore)
    },
    {
      key: 'status',
      label: 'Status',
      render: (device) => getStatusBadge(device)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (device) => (
        <div className="flex space-x-2">
          {device.isActive && (
            <>
              <Button
                size="sm"
                variant={device.isTrusted ? "secondary" : "primary"}
                onClick={() => handleTrustDevice(device.id, !device.isTrusted)}
              >
                {device.isTrusted ? 'Untrust' : 'Trust'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setSelectedDevice(device);
                  setShowRevokeModal(true);
                }}
              >
                Revoke
              </Button>
            </>
          )}
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading devices...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Device Management</h1>
          <p className="text-gray-600">Manage your registered devices and security settings</p>
        </div>
        <Button
          variant="danger"
          onClick={() => setShowRevokeAllModal(true)}
          disabled={devices.filter(d => d.isActive).length === 0}
        >
          Revoke All Devices
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Security Overview */}
      {securityAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{securityAnalysis.totalDevices}</div>
              <div className="text-sm text-gray-600">Total Devices</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{securityAnalysis.activeSessionsCount}</div>
              <div className="text-sm text-gray-600">Active Sessions</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{securityAnalysis.highRiskDevices}</div>
              <div className="text-sm text-gray-600">High Risk Devices</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{securityAnalysis.uniqueIPs}</div>
              <div className="text-sm text-gray-600">Unique IPs</div>
            </div>
          </Card>
        </div>
      )}

      {/* Security Flags */}
      {securityAnalysis && securityAnalysis.flags.length > 0 && (
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Security Alerts</h3>
          <div className="space-y-2">
            {securityAnalysis.flags.map((flag, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700 capitalize">{flag.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Devices Table */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Registered Devices</h2>
          <Button size="sm" onClick={loadDevices}>
            Refresh
          </Button>
        </div>
        
        {devices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No devices found
          </div>
        ) : (
          <Table
            data={devices}
            columns={deviceColumns}
            keyField="id"
          />
        )}
      </Card>

      {/* Revoke Device Modal */}
      <Modal
        isOpen={showRevokeModal}
        onClose={() => setShowRevokeModal(false)}
        title="Revoke Device"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to revoke access for "{selectedDevice?.deviceName}"? 
            This will immediately terminate all sessions on this device.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowRevokeModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRevokeDevice}
            >
              Revoke Device
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke All Devices Modal */}
      <Modal
        isOpen={showRevokeAllModal}
        onClose={() => setShowRevokeAllModal(false)}
        title="Revoke All Devices"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to revoke access for all devices except the current one? 
            This will immediately terminate all other active sessions.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowRevokeAllModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRevokeAllDevices}
            >
              Revoke All Devices
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeviceManagementPage;
