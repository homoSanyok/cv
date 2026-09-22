import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { dockService } from '../../app/services/dock.service';
import type { DockApplication, DockWindow } from '../../app/services/dock.service';
import { useSettings } from '../../app/services/settings.service';
import { Popover } from '../../shared/ui/popover';
import "./Dock.css";

export interface DockProps {
  className?: string;
}

const Application = ({ application }: { application: DockApplication }) => {
  const { language } = useSettings();
  const label = language === 'en'
    ? `Open “${application.name}”${application.hasOpenWindows ? ', app is running' : ', app is closed'}`
    : `Открыть приложение «${application.name}»${application.hasOpenWindows ? ', приложение запущено' : ', приложение закрыто'}`;

  return (
  <Popover content={application.name}>
    <div
      role="button"
      tabIndex={0}
      className="dock__application"
      data-open={application.hasOpenWindows}
      aria-label={label}
      onClick={() => dockService.activateApplication(application.name)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          dockService.activateApplication(application.name);
        }
      }}
    >
      <img src={application.icon} className="dock__application-icon" alt="" draggable={false} />
    </div>
  </Popover>
  );
};

const MinimizedWindow = ({ window }: { window: DockWindow }) => {
  const { language } = useSettings();
  const slotRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!previewRef.current || !slotRef.current || !buttonRef.current) return;

    return dockService.mountPreview(
      window.uuid, previewRef.current, slotRef.current, buttonRef.current,
    );
  }, [window.uuid, window.title, window.appName, window.appIcon]);

  useLayoutEffect(() => {
    if (window.focusOnMount) buttonRef.current?.focus({ preventScroll: true });
  }, [window.focusOnMount]);

  return (
    <div ref={slotRef} className="dock__slot" data-phase={window.phase}>
      <Popover
        disabled={window.phase !== 'minimized'}
        content={window.title}
      >
        <button
          ref={buttonRef}
          type="button"
          className="dock__window"
          aria-label={language === 'en'
            ? `Restore “${window.title}” window of “${window.appName}”`
            : `Восстановить окно «${window.title}» приложения «${window.appName}»`}
          aria-controls={window.uuid}
          aria-hidden={window.phase === 'restoring' ? true : undefined}
          disabled={window.phase !== 'minimized'}
          onClick={() => dockService.restore(window.uuid)}
        >
          <span ref={previewRef} className="dock__preview" aria-hidden="true" />
          <img
            src={window.appIcon}
            className="dock__window-app"
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        </button>
      </Popover>
    </div>
  );
};

export const Dock = ({ className = '' }: DockProps) => {
  const { language } = useSettings();
  const applications = useSyncExternalStore(
    dockService.subscribe,
    dockService.getApplicationsSnapshot,
    dockService.getApplicationsServerSnapshot,
  );
  const minimizedWindows = useSyncExternalStore(
    dockService.subscribe,
    dockService.getSnapshot,
    dockService.getServerSnapshot,
  );

  return (
    <div className={`dock ${className}`}>
      <div className="dock-background">
        <div className="glass-effect" />
      </div>
      <div className="frame">
        {applications.length > 0 && (
          <div className="dock__applications" role="group" aria-label={language === 'en' ? 'Applications' : 'Приложения'}>
            {applications.map((application) => (
              <Application key={application.name} application={application} />
            ))}
          </div>
        )}
        <div className="separator" aria-hidden="true" />
        {minimizedWindows.map((window) => (
          <MinimizedWindow key={window.uuid} window={window} />
        ))}
      </div>
    </div>
  );
};
