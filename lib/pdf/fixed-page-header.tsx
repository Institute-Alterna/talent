/* eslint-disable jsx-a11y/alt-text */

import React from 'react';
import type { ImageProps, TextProps, ViewProps } from '@react-pdf/renderer';
import { Image, Text, View } from '@react-pdf/renderer';
import { pdfAssets, pdfLabels } from './config';

type ViewStyle = ViewProps['style'];
type TextStyle = TextProps['style'];
type ImageStyle = ImageProps['style'];

interface FixedPageHeaderStyles {
  container: ViewStyle;
  logo: ImageStyle;
  confidentialBlock?: ViewStyle;
  confidentialTitle: TextStyle;
  confidentialCopy: TextStyle;
  metaBlock?: ViewStyle;
  metaPrimary?: TextStyle;
  metaSecondary?: TextStyle;
}

interface FixedPageHeaderProps {
  confidential: boolean;
  styles: FixedPageHeaderStyles;
  hideConfidentialOnFirstPage?: boolean;
  metaPrimary?: string;
  metaSecondary?: string;
  metaFromSecondPage?: boolean;
}

export function FixedPageHeader({
  confidential,
  styles,
  hideConfidentialOnFirstPage = false,
  metaPrimary,
  metaSecondary,
  metaFromSecondPage = false,
}: FixedPageHeaderProps) {
  return (
    <View style={styles.container} fixed>
      <Image src={pdfAssets.logoPath} style={styles.logo} />

      <View style={styles.confidentialBlock}>
        {confidential && (
          <>
            <Text
              style={styles.confidentialTitle}
              render={({ pageNumber }) =>
                hideConfidentialOnFirstPage && pageNumber <= 1 ? '' : pdfLabels.report.confidential
              }
            />
            <Text
              style={styles.confidentialCopy}
              render={({ pageNumber }) =>
                hideConfidentialOnFirstPage && pageNumber <= 1
                  ? ''
                  : pdfLabels.report.internalUseOnly
              }
            />
          </>
        )}

        {(metaPrimary || metaSecondary) && (
          <View style={styles.metaBlock}>
            {metaPrimary && (
              <Text
                style={styles.metaPrimary}
                render={({ pageNumber }) =>
                  metaFromSecondPage && pageNumber <= 1 ? '' : metaPrimary
                }
              />
            )}
            {metaSecondary && (
              <Text
                style={styles.metaSecondary}
                render={({ pageNumber }) =>
                  metaFromSecondPage && pageNumber <= 1 ? '' : metaSecondary
                }
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export default FixedPageHeader;