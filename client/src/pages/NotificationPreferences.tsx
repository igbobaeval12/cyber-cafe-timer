import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Bell, Volume2, MessageSquare, Mail, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface NotificationPreferences {
  enableSessionExpired: boolean;
  enableTimeWarning: boolean;
  enablePcOffline: boolean;
  enablePaymentFailed: boolean;
  enableLowBalance: boolean;
  enableSystemAlert: boolean;
  enableSoundAlerts: boolean;
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  timeWarningMinutes: number;
}

const defaultPreferences: NotificationPreferences = {
  enableSessionExpired: true,
  enableTimeWarning: true,
  enablePcOffline: true,
  enablePaymentFailed: true,
  enableLowBalance: true,
  enableSystemAlert: true,
  enableSoundAlerts: true,
  enablePushNotifications: true,
  enableEmailNotifications: false,
  timeWarningMinutes: 5,
};

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    defaultPreferences
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load preferences on mount
  const { data: savedPreferences } = trpc.notifications.getPreferences.useQuery();

  useEffect(() => {
    if (savedPreferences) {
      setPreferences(savedPreferences as NotificationPreferences);
      setHasChanges(false);
    }
  }, [savedPreferences]);

  const handlePreferenceChange = (
    key: keyof NotificationPreferences,
    value: boolean | number
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const updateMutation = trpc.notifications.updatePreferences.useMutation();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync(preferences);
      toast.success("Notification preferences saved successfully");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast.error("Failed to save notification preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPreferences(defaultPreferences);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Preferences</h1>
        <p className="text-gray-600 mt-2">
          Customize how and when you receive notifications
        </p>
      </div>

      <div className="grid gap-6">
        {/* Notification Types */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={20} />
            <h2 className="text-xl font-semibold">Notification Types</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-semibold">Session Expired</Label>
                <p className="text-sm text-gray-600">
                  Notify when a session expires
                </p>
              </div>
              <Switch
                checked={preferences.enableSessionExpired}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("enableSessionExpired", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-semibold">Time Warning</Label>
                <p className="text-sm text-gray-600">
                  Notify when time is running out
                </p>
              </div>
              <Switch
                checked={preferences.enableTimeWarning}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("enableTimeWarning", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-semibold">PC Offline</Label>
                <p className="text-sm text-gray-600">
                  Notify when a PC goes offline
                </p>
              </div>
              <Switch
                checked={preferences.enablePcOffline}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("enablePcOffline", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-semibold">Payment Failed</Label>
                <p className="text-sm text-gray-600">
                  Notify when payment processing fails
                </p>
              </div>
              <Switch
                checked={preferences.enablePaymentFailed}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("enablePaymentFailed", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-semibold">Low Balance</Label>
                <p className="text-sm text-gray-600">
                  Notify when prepaid balance is low
                </p>
              </div>
              <Switch
                checked={preferences.enableLowBalance}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("enableLowBalance", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-semibold">System Alerts</Label>
                <p className="text-sm text-gray-600">
                  Notify about system maintenance and updates
                </p>
              </div>
              <Switch
                checked={preferences.enableSystemAlert}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("enableSystemAlert", checked)
                }
              />
            </div>
          </div>
        </Card>

        {/* Notification Channels */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={20} />
            <h2 className="text-xl font-semibold">Notification Channels</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Volume2 size={18} />
                <div>
                  <Label className="font-semibold">Sound Alerts</Label>
                  <p className="text-sm text-gray-600">
                    Play sound when notifications arrive
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.enableSoundAlerts}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("enableSoundAlerts", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-semibold">Push Notifications</Label>
                <p className="text-sm text-gray-600">
                  Show browser push notifications
                </p>
              </div>
              <Switch
                checked={preferences.enablePushNotifications}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("enablePushNotifications", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail size={18} />
                <div>
                  <Label className="font-semibold">Email Notifications</Label>
                  <p className="text-sm text-gray-600">
                    Send email for important alerts
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.enableEmailNotifications}
                onCheckedChange={(checked) =>
                  handlePreferenceChange("enableEmailNotifications", checked)
                }
              />
            </div>
          </div>
        </Card>

        {/* Time Warning Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} />
            <h2 className="text-xl font-semibold">Time Warning Settings</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="timeWarning" className="font-semibold">
                Warn me when time remaining is:
              </Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  id="timeWarning"
                  type="number"
                  min="1"
                  max="60"
                  value={preferences.timeWarningMinutes}
                  onChange={(e) =>
                    handlePreferenceChange(
                      "timeWarningMinutes",
                      parseInt(e.target.value)
                    )
                  }
                  className="w-20"
                />
                <span className="text-gray-600">minutes</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                You'll receive a notification when a session has this much time
                remaining.
              </p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isSaving || updateMutation.isPending}
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving || updateMutation.isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}
