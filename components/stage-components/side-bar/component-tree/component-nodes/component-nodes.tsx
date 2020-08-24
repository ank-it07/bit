import { Icon } from '@teambit/evangelist-temp.elements.icon';
import { clickable } from 'bit-bin/dist/to-eject/css-components/clickable';
import { hoverable } from 'bit-bin/dist/to-eject/css-components/hoverable';
import classNames from 'classnames';
import React, { useState } from 'react';

import { indentClass, indentStyle } from '../indent';
import { PayloadType } from '../payload-type';
import { TreeLayer, TreeNodeProps } from '../recursive-tree';
import { StatusDot } from '../status-dot/status-dot';
import { getName } from '../utils/get-name';
import styles from './component-nodes.module.scss';

export function ScopeView({ node, depth }: TreeNodeProps<PayloadType>) {
  return (
    <>
      <div className={classNames(indentClass, styles.scope)}>{node.id}</div>

      <div style={indentStyle(depth + 1)}>
        {node.children && <TreeLayer childNodes={node.children} depth={depth} />}
      </div>
    </>
  );
}
export function NamespaceView({ node, depth }: TreeNodeProps<PayloadType>) {
  const [collapsed, collapse] = useState(false);

  return (
    <div data-collapsed={collapsed}>
      {node.id && (
        <div
          className={classNames(indentClass, hoverable, clickable, styles.namespace)}
          onClick={() => collapse(!collapsed)}
        >
          <div className={styles.left}>
            <Icon className={styles.arrow} of="fat-arrow-down" />
            <span className={styles.name}>{getName(node.id)}</span>
          </div>
          <div className={styles.right}>{status && <StatusDot status="new" />}</div>
        </div>
      )}

      <div style={indentStyle(depth + 1)} className={classNames(styles.componentTree, { [styles.open]: !collapsed })}>
        {node.children && <TreeLayer childNodes={node.children} depth={depth} />}
      </div>
    </div>
  );
}
